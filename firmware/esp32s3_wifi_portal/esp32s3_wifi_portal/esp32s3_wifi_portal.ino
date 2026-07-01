#include <DNSServer.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

static const char *AP_SSID = "ESP32S3-WiFi-Setup";
static const char *AP_PASSWORD = "change-me-ap-password";
static const char *LOGIN_USER = "admin";
static const char *LOGIN_PASSWORD = "change-me-login-password";
static const char *SESSION_COOKIE = "esp_session=ok";
static const char *LOCAL_POLL_URL = "http://127.0.0.1:18080/api/device/poll";
static const char *PUBLIC_POLL_URL = "https://example.com/api/device/poll";
static const char *LOCAL_OTA_URL = "http://127.0.0.1:18080/firmware/esp32.bin";
static const char *PUBLIC_OTA_URL = "https://example.com/firmware/esp32.bin";
static const char *DEVICE_TOKEN = "change-me-device-token";
static const int CONTROL_PIN = 2;
static const unsigned long CLOUD_POLL_INTERVAL_MS = 2000;

DNSServer dnsServer;
WebServer server(80);

String targetSsid;
String connectionMessage = "Not connected";
wl_status_t lastStatus = WL_IDLE_STATUS;
unsigned long connectStartedAt = 0;
bool staIpAnnounced = false;
unsigned long lastCloudPollAt = 0;
bool controlPinState = false;
String lastReportRoute = "none";
int lastReportHttpStatus = 0;
String lastWifiScanJson = "";
String wifiCloudStatus = "";

String htmlEscape(const String &value) {
  String escaped;
  escaped.reserve(value.length());
  for (size_t i = 0; i < value.length(); i++) {
    char c = value[i];
    if (c == '&') escaped += F("&amp;");
    else if (c == '<') escaped += F("&lt;");
    else if (c == '>') escaped += F("&gt;");
    else if (c == '"') escaped += F("&quot;");
    else if (c == '\'') escaped += F("&#39;");
    else escaped += c;
  }
  return escaped;
}

String jsonEscape(const String &value) {
  String escaped;
  escaped.reserve(value.length() + 8);
  for (size_t i = 0; i < value.length(); i++) {
    char c = value[i];
    if (c == '\\') escaped += F("\\\\");
    else if (c == '"') escaped += F("\\\"");
    else if (c == '\n') escaped += F("\\n");
    else if (c == '\r') escaped += F("\\r");
    else if (c == '\t') escaped += F("\\t");
    else escaped += c;
  }
  return escaped;
}

bool isLoggedIn() {
  return server.hasHeader("Cookie") && server.header("Cookie").indexOf(SESSION_COOKIE) >= 0;
}

void redirectTo(const String &path) {
  server.sendHeader("Location", path, true);
  server.send(302, "text/plain", "");
}

String urlEncode(const String &value) {
  String encoded;
  const char *hex = "0123456789ABCDEF";
  for (size_t i = 0; i < value.length(); i++) {
    uint8_t c = value[i];
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' || c == '.' || c == '~') {
      encoded += char(c);
    } else {
      encoded += '%';
      encoded += hex[c >> 4];
      encoded += hex[c & 0x0F];
    }
  }
  return encoded;
}

String extractJsonString(const String &json, const String &key) {
  String marker = "\"" + key + "\":\"";
  int start = json.indexOf(marker);
  if (start < 0) return "";
  start += marker.length();
  int end = json.indexOf('"', start);
  if (end < 0) return "";
  return json.substring(start, end);
}

void setControlPin(bool enabled) {
  controlPinState = enabled;
  digitalWrite(CONTROL_PIN, enabled ? HIGH : LOW);
}

String encryptionName(wifi_auth_mode_t type);

void applyCloudCommand(const String &command) {
  if (command == "on") {
    setControlPin(true);
  } else if (command == "off") {
    setControlPin(false);
  } else if (command == "toggle") {
    setControlPin(!controlPinState);
  } else if (command == "restart") {
    Serial.println("Restart command received");
    delay(300);
    ESP.restart();
  }
}

String scanNetworksJson() {
  int count = WiFi.scanNetworks(false, true);
  String json = "[";
  for (int i = 0; i < count; i++) {
    if (i > 0) json += ",";
    json += "{\"ssid\":\"" + jsonEscape(WiFi.SSID(i)) + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
    json += "\"auth\":\"" + encryptionName(WiFi.encryptionType(i)) + "\"}";
  }
  json += "]";
  WiFi.scanDelete();
  return json;
}

void connectToWifiNetwork(const String &ssid, const String &password) {
  if (ssid.length() == 0) {
    wifiCloudStatus = "connect_failed";
    return;
  }
  targetSsid = ssid;
  Serial.print("Cloud WiFi connect: ");
  Serial.println(targetSsid);
  WiFi.disconnect(false, false);
  delay(200);
  WiFi.begin(targetSsid.c_str(), password.c_str());
  connectStartedAt = millis();
  staIpAnnounced = false;
  connectionMessage = "Connecting to " + targetSsid;
  wifiCloudStatus = "connecting";
}

void otaStarted() {
  Serial.println("OTA started");
}

void otaFinished() {
  Serial.println("OTA finished");
}

void otaProgress(int current, int total) {
  Serial.printf("OTA progress: %d/%d\n", current, total);
}

void otaError(int error) {
  Serial.printf("OTA error %d: %s\n", error, httpUpdate.getLastErrorString().c_str());
}

template <typename TClient>
bool runOtaWithClient(TClient &client, const char *url) {
  Serial.print("Starting OTA from ");
  Serial.println(url);

  httpUpdate.onStart(otaStarted);
  httpUpdate.onEnd(otaFinished);
  httpUpdate.onProgress(otaProgress);
  httpUpdate.onError(otaError);
  httpUpdate.rebootOnUpdate(true);

  t_httpUpdate_return result = httpUpdate.update(client, url);
  if (result == HTTP_UPDATE_OK) {
    Serial.println("OTA update OK");
    return true;
  }

  Serial.print("OTA update failed/no update: ");
  Serial.print(httpUpdate.getLastError());
  Serial.print(" ");
  Serial.println(httpUpdate.getLastErrorString());
  return false;
}

void performOtaUpdate() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("OTA skipped: WiFi not connected");
    return;
  }

  WiFiClient localClient;
  if (runOtaWithClient(localClient, LOCAL_OTA_URL)) {
    return;
  }

  WiFiClientSecure publicClient;
  publicClient.setInsecure();
  runOtaWithClient(publicClient, PUBLIC_OTA_URL);
}

String buildDevicePostBody(const String &route) {
  String body = "token=" + urlEncode(DEVICE_TOKEN);
  body += "&ip=" + urlEncode(WiFi.localIP().toString());
  body += "&rssi=" + String(WiFi.RSSI());
  body += "&led=" + String(controlPinState ? "on" : "off");
  body += "&uptime=" + String(millis() / 1000);
  body += "&heap=" + String(ESP.getFreeHeap());
  body += "&heapTotal=" + String(ESP.getHeapSize());
  body += "&mac=" + urlEncode(WiFi.macAddress());
  body += "&ssid=" + urlEncode(WiFi.SSID());
  body += "&route=" + urlEncode(route);
  body += "&httpStatus=" + String(lastReportHttpStatus);
  if (lastWifiScanJson.length() > 0) {
    body += "&wifiScan=" + urlEncode(lastWifiScanJson);
  }
  if (wifiCloudStatus.length() > 0) {
    body += "&wifiStatus=" + urlEncode(wifiCloudStatus);
  }
  return body;
}

template <typename TClient>
String postDeviceStateWithClient(TClient &client, const char *url, const String &route) {
  HTTPClient http;
  http.setTimeout(1800);
  if (!http.begin(client, url)) {
    Serial.println("Cloud poll begin failed");
    return "";
  }

  String body = buildDevicePostBody(route);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  int code = http.POST(body);
  String response = http.getString();
  http.end();
  lastReportHttpStatus = code;

  Serial.print("Cloud poll HTTP ");
  Serial.print(code);
  Serial.print(" via ");
  Serial.print(url);
  Serial.print(": ");
  Serial.println(response);

  if (code == 200) {
    lastReportRoute = route;
    if (lastWifiScanJson.length() > 0) lastWifiScanJson = "";
    if (wifiCloudStatus == "scan_ready" || wifiCloudStatus == "connecting" || wifiCloudStatus == "connected" || wifiCloudStatus == "connect_failed") wifiCloudStatus = "";
    return response;
  }
  return "";
}

String postDeviceStateToCloud() {
  WiFiClient localClient;
  String response = postDeviceStateWithClient(localClient, LOCAL_POLL_URL, "local");
  if (response != "") {
    return response;
  }

  WiFiClientSecure publicClient;
  publicClient.setInsecure();
  return postDeviceStateWithClient(publicClient, PUBLIC_POLL_URL, "public");
}

void pollCloudServer() {
  if (WiFi.status() != WL_CONNECTED || millis() - lastCloudPollAt < CLOUD_POLL_INTERVAL_MS) {
    return;
  }
  lastCloudPollAt = millis();

  String response = postDeviceStateToCloud();
  String command = extractJsonString(response, "command");
  if (command != "" && command != "none") {
    if (command == "ota") {
      performOtaUpdate();
    } else if (command == "wifi_scan") {
      lastWifiScanJson = scanNetworksJson();
      wifiCloudStatus = "scan_ready";
      postDeviceStateToCloud();
    } else if (command == "wifi_connect") {
      String ssid = extractJsonString(response, "ssid");
      String password = extractJsonString(response, "password");
      connectToWifiNetwork(ssid, password);
      postDeviceStateToCloud();
    } else {
      applyCloudCommand(command);
      postDeviceStateToCloud();
    }
  }
}

String encryptionName(wifi_auth_mode_t type) {
  switch (type) {
    case WIFI_AUTH_OPEN: return "Open";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA";
    case WIFI_AUTH_WPA2_PSK: return "WPA2";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA/WPA2";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2 Enterprise";
    case WIFI_AUTH_WPA3_PSK: return "WPA3";
    case WIFI_AUTH_WPA2_WPA3_PSK: return "WPA2/WPA3";
    default: return "Secured";
  }
}

void handleRoot() {
  if (WiFi.status() == WL_CONNECTED) {
    redirectTo(isLoggedIn() ? "/main" : "/login");
    return;
  }

  String page = R"HTML(
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ESP32-S3 WiFi Setup</title>
  <style>
    :root { color-scheme: light; font-family: Arial, "Microsoft YaHei", sans-serif; }
    body { margin: 0; background: #f4f6f8; color: #17202a; }
    main { max-width: 760px; margin: 0 auto; padding: 22px 14px 34px; }
    header { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    h1 { font-size: 24px; margin: 0; }
    button { border: 0; border-radius: 6px; background: #1266d6; color: #fff; font-size: 15px; padding: 10px 14px; cursor: pointer; }
    button:disabled { opacity: .55; cursor: wait; }
    .panel { background: #fff; border: 1px solid #d8dee6; border-radius: 8px; overflow: hidden; }
    .status { margin-bottom: 14px; padding: 12px; border-radius: 8px; background: #eaf2ff; border: 1px solid #cfe0ff; line-height: 1.45; }
    .net { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; padding: 13px 14px; border-top: 1px solid #e6e9ee; cursor: pointer; }
    .net:first-child { border-top: 0; }
    .net:hover, .net.selected { background: #eef6ff; }
    .ssid { font-weight: 700; min-width: 0; overflow-wrap: anywhere; }
    .meta { color: #5d6b7a; font-size: 13px; }
    .rssi { font-weight: 700; color: #243447; }
    form { display: grid; gap: 10px; margin-top: 14px; background: #fff; border: 1px solid #d8dee6; border-radius: 8px; padding: 14px; }
    label { font-size: 13px; color: #405061; }
    input { width: 100%; box-sizing: border-box; border: 1px solid #bcc6d2; border-radius: 6px; font-size: 16px; padding: 10px 11px; }
    .row { display: grid; gap: 6px; }
    .empty { padding: 18px 14px; color: #5d6b7a; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>ESP32-S3 WiFi 设置</h1>
      <button id="scanBtn" type="button" onclick="scan()">刷新</button>
    </header>
    <div id="status" class="status">正在读取状态...</div>
    <section id="networks" class="panel"><div class="empty">正在扫描 WiFi...</div></section>
    <form onsubmit="connectWifi(event)">
      <div class="row">
        <label for="ssid">选择的 WiFi</label>
        <input id="ssid" name="ssid" required placeholder="请从上方列表选择，也可以手动输入">
      </div>
      <div class="row">
        <label for="password">WiFi 密码</label>
        <input id="password" name="password" type="password" placeholder="开放网络可留空">
      </div>
      <button id="connectBtn" type="submit">连接</button>
    </form>
  </main>
  <script>
    const networksEl = document.getElementById('networks');
    const statusEl = document.getElementById('status');
    const scanBtn = document.getElementById('scanBtn');
    const ssidEl = document.getElementById('ssid');
    const passwordEl = document.getElementById('password');
    const connectBtn = document.getElementById('connectBtn');

    function securityText(auth) { return auth === 'Open' ? '开放网络' : auth; }
    function bars(rssi) {
      if (rssi >= -55) return '强';
      if (rssi >= -70) return '中';
      return '弱';
    }
    async function refreshStatus() {
      const res = await fetch('/status');
      const data = await res.json();
      statusEl.textContent = data.message + (data.ip ? '，IP：' + data.ip : '');
    }
    async function scan() {
      scanBtn.disabled = true;
      networksEl.innerHTML = '<div class="empty">正在扫描 WiFi...</div>';
      try {
        const res = await fetch('/scan');
        const list = await res.json();
        if (!list.length) {
          networksEl.innerHTML = '<div class="empty">没有扫描到 WiFi，请确认手机热点已开启 2.4GHz。</div>';
          return;
        }
        networksEl.innerHTML = '';
        list.forEach(net => {
          const item = document.createElement('div');
          item.className = 'net';
          item.onclick = () => {
            document.querySelectorAll('.net').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            ssidEl.value = net.ssid;
            passwordEl.focus();
          };
          item.innerHTML = '<div class="ssid"></div><div class="rssi"></div><div class="meta"></div><div class="meta"></div>';
          item.children[0].textContent = net.ssid || '(隐藏网络)';
          item.children[1].textContent = bars(net.rssi);
          item.children[2].textContent = securityText(net.auth);
          item.children[3].textContent = net.rssi + ' dBm';
          networksEl.appendChild(item);
        });
      } finally {
        scanBtn.disabled = false;
      }
    }
    async function connectWifi(event) {
      event.preventDefault();
      connectBtn.disabled = true;
      statusEl.textContent = '正在连接 ' + ssidEl.value + ' ...';
      const body = new URLSearchParams({ ssid: ssidEl.value, password: passwordEl.value });
      const res = await fetch('/connect', { method: 'POST', body });
      const data = await res.json();
      statusEl.textContent = data.message + (data.ip ? '，IP：' + data.ip : '');
      connectBtn.disabled = false;
      setTimeout(refreshStatus, 2500);
    }
    scan();
    refreshStatus();
    setInterval(refreshStatus, 5000);
  </script>
</body>
</html>
)HTML";

  server.send(200, "text/html; charset=utf-8", page);
}

void handleLoginPage() {
  if (isLoggedIn()) {
    redirectTo("/main");
    return;
  }

  String error = server.hasArg("error") ? "<p class=\"error\">用户名或密码不正确</p>" : "";
  String page = R"HTML(
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ESP32-S3 Login</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f3f6f9; color: #17202a; font-family: Arial, "Microsoft YaHei", sans-serif; }
    main { width: min(360px, calc(100vw - 28px)); background: #fff; border: 1px solid #d8dee6; border-radius: 8px; padding: 22px; box-sizing: border-box; }
    h1 { margin: 0 0 18px; font-size: 24px; }
    form { display: grid; gap: 12px; }
    label { display: grid; gap: 6px; font-size: 13px; color: #405061; }
    input { border: 1px solid #bcc6d2; border-radius: 6px; font-size: 16px; padding: 10px 11px; }
    button { border: 0; border-radius: 6px; background: #1266d6; color: #fff; font-size: 16px; padding: 11px 14px; cursor: pointer; }
    .error { margin: 0 0 12px; color: #b42318; font-size: 14px; }
  </style>
</head>
<body>
  <main>
    <h1>ESP32-S3 登录</h1>
)HTML";
  page += error;
  page += R"HTML(
    <form method="post" action="/login">
      <label>用户名<input name="user" autocomplete="username" required></label>
      <label>密码<input name="password" type="password" autocomplete="current-password" required></label>
      <button type="submit">登录</button>
    </form>
  </main>
</body>
</html>
)HTML";
  server.send(200, "text/html; charset=utf-8", page);
}

void handleLoginPost() {
  String user = server.arg("user");
  String password = server.arg("password");
  if (user == LOGIN_USER && password == LOGIN_PASSWORD) {
    server.sendHeader("Set-Cookie", String(SESSION_COOKIE) + "; Path=/; HttpOnly; SameSite=Lax");
    redirectTo("/main");
    return;
  }
  redirectTo("/login?error=1");
}

void handleLogout() {
  server.sendHeader("Set-Cookie", "esp_session=; Path=/; Max-Age=0");
  redirectTo("/login");
}

void handleMainPage() {
  if (!isLoggedIn()) {
    redirectTo("/login");
    return;
  }

  String ip = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : "未连接";
  String page = R"HTML(
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ESP32-S3 Main</title>
  <style>
    body { margin: 0; background: #f4f6f8; color: #17202a; font-family: Arial, "Microsoft YaHei", sans-serif; }
    header { background: #fff; border-bottom: 1px solid #d8dee6; }
    .bar, main { max-width: 860px; margin: 0 auto; padding: 16px; box-sizing: border-box; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    h1 { margin: 0; font-size: 22px; }
    main { display: grid; gap: 14px; }
    section { background: #fff; border: 1px solid #d8dee6; border-radius: 8px; padding: 16px; }
    h2 { margin: 0 0 10px; font-size: 18px; }
    p { margin: 6px 0; line-height: 1.5; }
    a, button { border: 0; border-radius: 6px; background: #1266d6; color: #fff; text-decoration: none; font-size: 14px; padding: 9px 12px; cursor: pointer; }
    .muted { color: #5d6b7a; }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <h1>ESP32-S3 主页面</h1>
      <a href="/logout">退出</a>
    </div>
  </header>
  <main>
    <section>
      <h2>设备状态</h2>
)HTML";
  page += "<p>WiFi：";
  page += htmlEscape(WiFi.SSID());
  page += "</p><p>IP 地址：";
  page += htmlEscape(ip);
  page += "</p><p>信号强度：";
  page += String(WiFi.RSSI());
  page += " dBm</p>";
  page += R"HTML(
    </section>
    <section>
      <h2>主页面</h2>
      <p class="muted">这里是后续功能的预留区域。</p>
    </section>
  </main>
</body>
</html>
)HTML";
  server.send(200, "text/html; charset=utf-8", page);
}

void handleScan() {
  server.send(200, "application/json", scanNetworksJson());
}

void updateConnectionState() {
  wl_status_t status = WiFi.status();
  if (status == WL_CONNECTED) {
    if (!staIpAnnounced) {
      Serial.print("Connected. STA IP: ");
      Serial.println(WiFi.localIP());
      staIpAnnounced = true;
    }
    lastStatus = status;
    connectionMessage = "Connected to " + targetSsid;
    if (connectStartedAt > 0) {
      wifiCloudStatus = "connected";
      connectStartedAt = 0;
    }
    return;
  }

  staIpAnnounced = false;
  if (connectStartedAt > 0 && millis() - connectStartedAt > 20000) {
    connectStartedAt = 0;
    lastStatus = status;
    connectionMessage = "Connection failed or timed out";
    wifiCloudStatus = "connect_failed";
  } else if (connectStartedAt > 0) {
    connectionMessage = "Connecting to " + targetSsid;
  } else {
    lastStatus = status;
  }
}

void handleStatus() {
  updateConnectionState();
  String json = "{\"connected\":";
  json += WiFi.status() == WL_CONNECTED ? "true" : "false";
  json += ",\"message\":\"" + jsonEscape(connectionMessage) + "\"";
  if (WiFi.status() == WL_CONNECTED) {
    json += ",\"ip\":\"" + WiFi.localIP().toString() + "\"";
  }
  json += "}";
  server.send(200, "application/json", json);
}

void handleConnect() {
  if (!server.hasArg("ssid")) {
    server.send(400, "application/json", "{\"message\":\"Missing SSID\"}");
    return;
  }

  targetSsid = server.arg("ssid");
  String password = server.arg("password");

  Serial.print("Connecting to SSID: ");
  Serial.println(targetSsid);

  WiFi.disconnect(false, false);
  delay(200);
  WiFi.begin(targetSsid.c_str(), password.c_str());

  connectStartedAt = millis();
  staIpAnnounced = false;
  connectionMessage = "Connecting to " + targetSsid;
  handleStatus();
}

void handleNotFound() {
  if (WiFi.status() == WL_CONNECTED) {
    redirectTo(isLoggedIn() ? "/main" : "/login");
  } else {
    server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString(), true);
    server.send(302, "text/plain", "");
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(CONTROL_PIN, OUTPUT);
  setControlPin(false);

  WiFi.mode(WIFI_AP_STA);
  WiFi.begin();
  connectStartedAt = millis();
  connectionMessage = "Connecting to saved WiFi";
  WiFi.softAP(AP_SSID, AP_PASSWORD);

  dnsServer.start(53, "*", WiFi.softAPIP());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/login", HTTP_GET, handleLoginPage);
  server.on("/login", HTTP_POST, handleLoginPost);
  server.on("/logout", HTTP_GET, handleLogout);
  server.on("/main", HTTP_GET, handleMainPage);
  server.on("/scan", HTTP_GET, handleScan);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/connect", HTTP_POST, handleConnect);
  const char *headerKeys[] = {"Cookie"};
  server.collectHeaders(headerKeys, 1);
  server.onNotFound(handleNotFound);
  server.begin();

  Serial.println();
  Serial.println("WiFi setup portal started");
  Serial.print("AP SSID: ");
  Serial.println(AP_SSID);
  Serial.print("AP password: ");
  Serial.println(AP_PASSWORD);
  Serial.print("Open: http://");
  Serial.println(WiFi.softAPIP());
}

void loop() {
  dnsServer.processNextRequest();
  server.handleClient();
  updateConnectionState();
  pollCloudServer();
}
