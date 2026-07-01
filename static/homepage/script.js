(function () {
  const root = document.documentElement;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  let tracks = [];
  const translations = {
    zh: {
      theme: "主题",
      top: "回到顶部",
      themeMenu: "切换主题",
      musicMenu: "切换播放",
      noteMenu: "随机提示",
      themeChanged: "主题已切换",
      themeDark: "已切换为深色主题",
      themeLight: "已切换为浅色主题",
      greetingLate: "深夜好",
      greetingMorning: "上午好",
      greetingNoon: "中午好",
      greetingAfternoon: "下午好",
      greetingEvening: "晚上好",
      greetingSuffix: "，欢迎回来",
      linksTitle: "功能模块",
      espCardTitle: "ESP32 模块",
      espCardText: "点击后在当前页面局部展开受保护入口。",
      addModuleTitle: "新增模块",
      addModuleText: "保存一个网址，生成新的快捷入口。",
      addModuleFormTitle: "添加网址",
      moduleNamePlaceholder: "模块名称",
      moduleUrlPlaceholder: "https://example.com",
      moduleSave: "保存",
      moduleCancel: "取消",
      moduleAdded: "模块已添加",
      moduleInvalidUrl: "请输入有效网址",
      moduleDeleteConfirm: "确认删除这个模块吗？",
      moduleDeleted: "模块已删除",
      espModuleTitle: "ESP32-S3 远程主页",
      espOnlineLabel: "在线状态",
      espIpLabel: "设备 IP",
      espRssiLabel: "WiFi RSSI",
      espHeapLabel: "剩余内存",
      espLockEyebrow: "受保护模块",
      espLockTitle: "输入 ESP32-S3 账号密码后查看远程主页",
      espLockText: "默认不会在个人主页中加载控制台，认证通过后才会显示远程页面。",
      espUserLabel: "账号",
      espPasswordLabel: "密码",
      espUnlockButton: "解锁",
      espUnlocking: "正在验证...",
      espUnlockOk: "认证成功，正在打开远程主页。",
      espUnlockFailed: "账号或密码不正确。",
      espUnlockError: "认证失败，请检查服务器是否在线。",
      espModuleOpened: "ESP32-S3 模块已展开",
      espIpHidden: "已隐藏",
      checking: "检测中",
      online: "在线",
      offline: "离线",
      unreadable: "无法读取",
      paused: "已暂停",
      playingPrefix: "正在播放：",
      switchedPrefix: "切换到：",
      langChanged: "语言已切换",
      notes: ["继续折腾。", "服务在线。", "今天也要稳定运行。"]
    },
    en: {
      theme: "Theme",
      top: "Back to top",
      themeMenu: "Switch theme",
      musicMenu: "Toggle music",
      noteMenu: "Random note",
      themeChanged: "Theme switched",
      themeDark: "Switched to dark theme",
      themeLight: "Switched to light theme",
      greetingLate: "Late night",
      greetingMorning: "Good morning",
      greetingNoon: "Good noon",
      greetingAfternoon: "Good afternoon",
      greetingEvening: "Good evening",
      greetingSuffix: ", welcome back",
      linksTitle: "Feature Modules",
      espCardTitle: "ESP32 Module",
      espCardText: "Click to open the protected entry inline on this page.",
      addModuleTitle: "Add Module",
      addModuleText: "Save a URL and generate a new quick entry.",
      addModuleFormTitle: "Add URL",
      moduleNamePlaceholder: "Module name",
      moduleUrlPlaceholder: "https://example.com",
      moduleSave: "Save",
      moduleCancel: "Cancel",
      moduleAdded: "Module added",
      moduleInvalidUrl: "Enter a valid URL",
      moduleDeleteConfirm: "Delete this module?",
      moduleDeleted: "Module deleted",
      espModuleTitle: "ESP32-S3 Remote Home",
      espOnlineLabel: "Online",
      espIpLabel: "Device IP",
      espRssiLabel: "WiFi RSSI",
      espHeapLabel: "Free memory",
      espLockEyebrow: "Protected Module",
      espLockTitle: "Enter ESP32-S3 credentials to view the remote home",
      espLockText: "The console is not loaded inside the homepage by default. It appears only after successful authentication.",
      espUserLabel: "Username",
      espPasswordLabel: "Password",
      espUnlockButton: "Unlock",
      espUnlocking: "Verifying...",
      espUnlockOk: "Authenticated. Opening remote home.",
      espUnlockFailed: "Incorrect username or password.",
      espUnlockError: "Authentication failed. Check whether the server is online.",
      espModuleOpened: "ESP32-S3 module opened",
      espIpHidden: "Hidden",
      checking: "checking",
      online: "online",
      offline: "offline",
      unreadable: "unreadable",
      paused: "Paused",
      playingPrefix: "Playing: ",
      switchedPrefix: "Switched to: ",
      langChanged: "Language changed",
      notes: ["Keep building.", "Service online.", "Stable run today."]
    }
  };
  let currentTrack = 0;
  let playing = false;
  let toastTimer = 0;
  let esp32ModuleOpened = false;
  let esp32Authenticated = false;
  let esp32StatusTimer = 0;
  let customDragIndex = -1;
  let audio = null;
  let playQueue = [];
  let queuePosition = 0;
  let songListLoaded = false;
  let songListLoading = null;
  const preloadPool = [];

  function currentLang() {
    return localStorage.getItem("uiLang") === "en" ? "en" : "zh";
  }

  function t(key) {
    const lang = currentLang();
    return (translations[lang] && translations[lang][key]) || translations.zh[key] || key;
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function initLoading() {
    const loading = $("#loading");
    if (loading) loading.classList.add("done");
  }

  function initClock() {
    const clock = $("#clock");
    const date = $("#date");
    const greeting = $("#greeting");
    function tick() {
      const now = new Date();
      const weekdays = currentLang() === "zh" ? ["日", "一", "二", "三", "四", "五", "六"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      if (clock) clock.textContent = `${h}:${m}:${s}`;
      if (date) {
        date.textContent = currentLang() === "zh"
          ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`
          : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${weekdays[now.getDay()]}`;
      }
      const hour = now.getHours();
      const word = hour < 6 ? t("greetingLate") : hour < 11 ? t("greetingMorning") : hour < 13 ? t("greetingNoon") : hour < 18 ? t("greetingAfternoon") : t("greetingEvening");
      if (greeting) greeting.textContent = `${word}${t("greetingSuffix")}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  function initScroll() {
    const fill = $("#scrollFill");
    const top = $("#backTop");
    window.addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      fill.style.width = (max > 0 ? scrollY / max * 100 : 0) + "%";
      top.classList.toggle("show", scrollY > 260);
    }, { passive: true });
    top.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  }

  function setTheme(isDark) {
    root.classList.toggle("dark", isDark);
    localStorage.setItem("homepage-theme", isDark ? "dark" : "light");
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("homepage-theme");
    setTheme(savedTheme ? savedTheme === "dark" : true);
    $("#themeToggle").addEventListener("click", () => {
      setTheme(!root.classList.contains("dark"));
      toast(root.classList.contains("dark") ? t("themeDark") : t("themeLight"));
    });
  }

  function initContextMenu() {
    const menu = $("#contextMenu");
    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      menu.style.left = Math.min(event.clientX, innerWidth - 190) + "px";
      menu.style.top = Math.min(event.clientY, innerHeight - 190) + "px";
      menu.classList.add("open");
    });
    document.addEventListener("click", () => menu.classList.remove("open"));
    menu.addEventListener("click", (event) => {
      const action = event.target.dataset.action;
      if (!action) return;
      if (action === "top") scrollTo({ top: 0, behavior: "smooth" });
      if (action === "theme") {
        setTheme(!root.classList.contains("dark"));
        toast(t("themeChanged"));
      }
      if (action === "music") toggleMusic();
      if (action === "note") {
        const notes = t("notes");
        toast(notes[Math.floor(Math.random() * notes.length)]);
      }
    });
  }

  function renderTrack() {
    const trackName = $("#trackName");
    const playlist = $("#playlist");
    if (!tracks.length) {
      if (trackName) trackName.textContent = currentLang() === "zh" ? "暂无歌曲" : "No songs";
      if (playlist) playlist.innerHTML = `<li>${currentLang() === "zh" ? "请把音乐文件放入 static/song" : "Put audio files into static/song"}</li>`;
      return;
    }
    if (trackName) trackName.textContent = tracks[currentTrack].name;
    if (playlist) {
      playlist.innerHTML = "";
      tracks.forEach((track, index) => {
        const li = document.createElement("li");
        li.textContent = track.name;
        li.classList.toggle("active", index === currentTrack);
        li.addEventListener("click", () => {
          currentTrack = index;
          playCurrentTrack(true);
        });
        playlist.appendChild(li);
      });
    }
  }

  function setPlayingState(isPlaying) {
    playing = isPlaying;
    $("#disc").classList.toggle("playing", playing);
    $("#playMusic").textContent = playing ? "⏸" : "▶";
  }

  async function playCurrentTrack(showToast) {
    if (!tracks.length || !audio) return;
    audio.src = tracks[currentTrack].url;
    audio.load();
    try {
      await audio.play();
      setPlayingState(true);
      renderTrack();
      preloadUpcomingTracks();
      if (showToast) toast(`${t("playingPrefix")}${tracks[currentTrack].name}`);
    } catch (error) {
      setPlayingState(false);
      if (showToast) toast(currentLang() === "zh" ? "浏览器阻止了自动播放，请手动点击播放" : "Autoplay blocked. Click play manually.");
    }
  }

  async function toggleMusic() {
    if (!songListLoaded) {
      await loadSongList();
    }
    if (!tracks.length || !audio) {
      toast(currentLang() === "zh" ? "没有可播放歌曲" : "No playable songs");
      return;
    }
    if (playing) {
      audio.pause();
      setPlayingState(false);
      toast(t("paused"));
    } else {
      playCurrentTrack(true);
    }
  }

  function moveTrack(step) {
    if (!tracks.length) return;
    if (!playQueue.length) buildPlayQueue();
    queuePosition = (queuePosition + step + playQueue.length) % playQueue.length;
    currentTrack = playQueue[queuePosition];
    if (playing) {
      playCurrentTrack(true);
    } else {
      renderTrack();
      preloadUpcomingTracks();
      toast(`${t("switchedPrefix")}${tracks[currentTrack].name}`);
    }
  }

  function buildPlayQueue() {
    playQueue = shuffle(tracks.map((_, index) => index));
    queuePosition = Math.max(0, playQueue.indexOf(currentTrack));
    if (queuePosition < 0) queuePosition = 0;
  }

  function nextQueuedTrack() {
    if (!tracks.length) return;
    if (!playQueue.length) buildPlayQueue();
    queuePosition += 1;
    if (queuePosition >= playQueue.length) {
      const previous = currentTrack;
      buildPlayQueue();
      if (playQueue.length > 1 && playQueue[0] === previous) {
        playQueue.push(playQueue.shift());
      }
      queuePosition = 0;
    }
    currentTrack = playQueue[queuePosition];
  }

  function preloadUpcomingTracks() {
    preloadPool.splice(0).forEach((item) => {
      item.pause();
      item.removeAttribute("src");
      item.load();
    });
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  async function loadSongList() {
    if (songListLoading) return songListLoading;
    songListLoading = (async () => {
    try {
      const response = await fetch("/api/songs");
      if (!response.ok) throw new Error("status " + response.status);
      const allSongs = await response.json();
      tracks = shuffle(allSongs).slice(0, 10);
      currentTrack = tracks.length ? Math.floor(Math.random() * tracks.length) : 0;
      buildPlayQueue();
    } catch (error) {
      tracks = [];
    } finally {
      songListLoaded = true;
      songListLoading = null;
      renderTrack();
    }
    })();
    return songListLoading;
  }

  function initPlayer() {
    const visualizer = $("#visualizer");
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("ended", () => {
      nextQueuedTrack();
      playCurrentTrack(false);
    });
    audio.addEventListener("error", () => {
      if (!tracks.length) return;
      nextQueuedTrack();
      if (playing) playCurrentTrack(false);
    });
    for (let i = 0; i < 18; i += 1) {
      visualizer.appendChild(document.createElement("span"));
    }
    $("#playMusic").addEventListener("click", toggleMusic);
    $("#prevTrack").addEventListener("click", () => moveTrack(-1));
    $("#nextTrack").addEventListener("click", () => moveTrack(1));
    $("#randomTrack").addEventListener("click", () => {
      buildPlayQueue();
      queuePosition = 0;
      currentTrack = playQueue[0] || 0;
      playCurrentTrack(true);
    });
    setInterval(() => {
      $$("#visualizer span").forEach((bar) => {
        bar.style.height = (playing ? Math.random() * 42 + 4 : 4) + "px";
      });
    }, 130);
    const loadSongsLater = () => loadSongList();
    if ("requestIdleCallback" in window) {
      requestIdleCallback(loadSongsLater, { timeout: 2500 });
    } else {
      setTimeout(loadSongsLater, 1200);
    }
  }

  function initTerminal() {
    const lines = [
      "> boot homepage",
      "[ok] local static page ready",
      "[ok] cloudflare tunnel prepared",
      "[info] homepage: https://pzq1688.com",
      "[info] esp32 module: click the ESP32 card to open inline",
      "[info] search provider: bing",
      "[todo] replace links with your real accounts",
      "[todo] add music files when you want real playback",
      "> waiting for next command"
    ];
    $("#terminalText").textContent = lines.join("\n");
  }

  function initParticles() {
    const canvas = $("#particleCanvas");
    const ctx = canvas.getContext("2d");
    const points = Array.from({ length: 64 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - .5) * .0007,
      vy: (Math.random() - .5) * .0007
    }));
    function size() {
      canvas.width = innerWidth * devicePixelRatio;
      canvas.height = innerHeight * devicePixelRatio;
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      points.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 2.2 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fillStyle = root.classList.contains("dark") ? "rgba(97,212,255,.32)" : "rgba(47,128,237,.22)";
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    size();
    addEventListener("resize", size);
    draw();
  }

  function initVisits() {
    const key = "homepage-visits";
    const count = Number(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, String(count));
    $("#visitCount").textContent = String(count);
  }

  function initSearchShortcut() {
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        $("#searchInput").focus();
      }
    });
  }

  function syncEsp32FrameLang(lang) {
    const frame = $("#esp32Frame");
    if (!frame || !frame.contentWindow) return;
    try {
      frame.contentWindow.localStorage.setItem("uiLang", lang);
      if (typeof frame.contentWindow.setLang === "function") {
        frame.contentWindow.setLang(lang);
      } else if (typeof frame.contentWindow.applyLang === "function") {
        frame.contentWindow.applyLang();
      }
    } catch (error) {
      frame.src = frame.src;
    }
  }

  function applyLanguage(lang) {
    const normalized = lang === "en" ? "en" : "zh";
    localStorage.setItem("uiLang", normalized);
    root.lang = normalized === "zh" ? "zh-CN" : "en";
    $$("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    $$("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    $$("[data-lang]").forEach((el) => {
      el.classList.toggle("active", el.dataset.lang === normalized);
    });
    const menuItems = $$("#contextMenu button");
    if (menuItems[0]) menuItems[0].textContent = t("top");
    if (menuItems[1]) menuItems[1].textContent = t("themeMenu");
    if (menuItems[2]) menuItems[2].textContent = t("musicMenu");
    if (menuItems[3]) menuItems[3].textContent = t("noteMenu");
    const online = $("#espOnline");
    if (online && (online.textContent === "检测中" || online.textContent === "checking")) {
      online.textContent = t("checking");
    }
    syncEsp32FrameLang(normalized);
  }

  function initLanguage() {
    applyLanguage(currentLang());
    $$("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        applyLanguage(button.dataset.lang);
        toast(t("langChanged"));
      });
    });
    const frame = $("#esp32Frame");
    if (frame) {
      frame.addEventListener("load", () => syncEsp32FrameLang(currentLang()));
    }
  }

  function showEsp32Frame() {
    const wrap = $("#esp32FrameWrap");
    const lock = $("#esp32Lock");
    if (!wrap) return;
    let frame = $("#esp32Frame");
    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "esp32Frame";
      frame.title = "ESP32-S3 控制台";
      frame.src = "/main";
      frame.addEventListener("load", () => syncEsp32FrameLang(currentLang()));
      wrap.appendChild(frame);
    }
    wrap.classList.remove("hidden");
    if (lock) lock.classList.add("hidden");
  }

  function hideInternalModules(active) {
    if (active !== "esp32") {
      const espTitle = $("#esp32-module");
      const espPanel = $("#esp32ModulePanel");
      if (espTitle) espTitle.classList.add("hidden");
      if (espPanel) espPanel.classList.add("hidden");
    }
    if (active !== "storage") {
      const storageTitle = $("#storage-module");
      const storagePanel = $("#storageModulePanel");
      if (storageTitle) storageTitle.classList.add("hidden");
      if (storagePanel) storagePanel.classList.add("hidden");
    }
  }

  function initEsp32Unlock() {
    const form = $("#espUnlockForm");
    if (!form) return;
    const message = $("#espAuthMessage");
    const password = $("#espPassword");
    const toggle = $("#espPasswordToggle");
    if (password && toggle) {
      toggle.addEventListener("click", () => {
        const visible = password.type === "text";
        password.type = visible ? "password" : "text";
        toggle.textContent = visible ? "显示" : "隐藏";
        toggle.setAttribute("aria-label", visible ? "显示密码" : "隐藏密码");
        toggle.title = visible ? "显示密码" : "隐藏密码";
        password.focus();
      });
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector("button[type='submit']");
      if (message) message.textContent = t("espUnlocking");
      if (submit) submit.disabled = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      try {
        const response = await fetch("/api/login", {
          method: "POST",
          credentials: "same-origin",
          signal: controller.signal,
          body: new URLSearchParams({
            user: $("#espUser").value,
            password: $("#espPassword").value
          })
        });
        if (!response.ok) {
          if (message) message.textContent = t("espUnlockFailed");
          return;
        }
        if (message) message.textContent = t("espUnlockOk");
        esp32Authenticated = true;
        showEsp32Frame();
        refreshEsp32Status();
      } catch (error) {
        if (message) {
          message.textContent = error.name === "AbortError"
            ? "认证请求超时，请刷新页面或稍后再试。"
            : t("espUnlockError");
        }
      } finally {
        clearTimeout(timeout);
        if (submit) submit.disabled = false;
      }
    });
  }

  function openEsp32Module() {
    const title = $("#esp32-module");
    const panel = $("#esp32ModulePanel");
    if (!title || !panel) return;
    hideInternalModules("esp32");
    title.classList.remove("hidden");
    panel.classList.remove("hidden");
    if (!esp32ModuleOpened) {
      esp32ModuleOpened = true;
      refreshEsp32Status();
      esp32StatusTimer = setInterval(refreshEsp32Status, 3000);
      toast(t("espModuleOpened"));
    }
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initEsp32ModuleOpen() {
    ["#esp32ModuleOpen", "#esp32QuickOpen"].forEach((selector) => {
      const el = $(selector);
      if (!el) return;
      el.addEventListener("click", (event) => {
        event.preventDefault();
        openEsp32Module();
      });
    });
  }

  function openStorageModule() {
    const title = $("#storage-module");
    const panel = $("#storageModulePanel");
    const frame = $("#storageFrame");
    if (!title || !panel || !frame) return;
    hideInternalModules("storage");
    title.classList.remove("hidden");
    panel.classList.remove("hidden");
    if (!frame.src) {
      frame.src = frame.dataset.src || "/storage";
    }
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function initStorageModuleOpen() {
    const el = $("#storageModuleOpen");
    if (!el) return;
    el.addEventListener("click", (event) => {
      event.preventDefault();
      openStorageModule();
    });
  }

  function normalizeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : "https://" + raw;
    try {
      return new URL(withProtocol).href;
    } catch (error) {
      return "";
    }
  }

  function readCustomModules() {
    try {
      const parsed = JSON.parse(localStorage.getItem("homepage-custom-modules") || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.name && item.url) : [];
    } catch (error) {
      return [];
    }
  }

  function writeCustomModules(items) {
    localStorage.setItem("homepage-custom-modules", JSON.stringify(items));
  }

  function renderCustomModules() {
    const host = $("#customModules");
    if (!host) return;
    host.innerHTML = "";
    const items = readCustomModules();
    items.forEach((item, index) => {
      const card = document.createElement("a");
      card.className = "link-card custom-module-card";
      card.href = item.url;
      card.target = "_blank";
      card.rel = "noreferrer";
      card.dataset.index = String(index);
      const body = document.createElement("div");
      const title = document.createElement("h3");
      const text = document.createElement("p");
      const badge = document.createElement("span");
      const remove = document.createElement("button");
      title.textContent = item.name;
      text.textContent = item.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      badge.textContent = String(index + 9).padStart(2, "0");
      remove.className = "module-delete";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Delete module");
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!confirm(t("moduleDeleteConfirm"))) return;
        const next = readCustomModules();
        next.splice(index, 1);
        writeCustomModules(next);
        renderCustomModules();
        toast(t("moduleDeleted"));
      });
      body.append(title, text);
      card.append(body, badge, remove);
      bindCustomModuleDrag(card);
      host.appendChild(card);
    });
  }

  function moveCustomModule(from, to) {
    if (from === to || from < 0 || to < 0) return;
    const items = readCustomModules();
    if (from >= items.length || to >= items.length) return;
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    writeCustomModules(items);
    renderCustomModules();
  }

  function bindCustomModuleDrag(card) {
    let pressTimer = 0;
    let longPressed = false;
    const startPress = () => {
      clearTimeout(pressTimer);
      longPressed = false;
      pressTimer = setTimeout(() => {
        longPressed = true;
        card.draggable = true;
        card.classList.add("drag-ready");
      }, 420);
    };
    const clearPress = () => {
      clearTimeout(pressTimer);
      if (!longPressed) card.draggable = false;
      setTimeout(() => {
        if (!card.classList.contains("dragging")) {
          card.classList.remove("drag-ready");
          card.draggable = false;
        }
      }, 0);
    };
    card.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".module-delete")) return;
      startPress();
    });
    card.addEventListener("pointerup", clearPress);
    card.addEventListener("pointerleave", clearPress);
    card.addEventListener("click", (event) => {
      if (longPressed) {
        event.preventDefault();
        longPressed = false;
      }
    });
    card.addEventListener("dragstart", (event) => {
      customDragIndex = Number(card.dataset.index);
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", card.dataset.index);
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("drag-over");
      event.dataTransfer.dropEffect = "move";
    });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drag-over");
      moveCustomModule(customDragIndex, Number(card.dataset.index));
      customDragIndex = -1;
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging", "drag-ready", "drag-over");
      card.draggable = false;
      customDragIndex = -1;
    });
  }

  function initCustomModules() {
    const open = $("#addModuleOpen");
    const form = $("#addModuleForm");
    const cancel = $("#addModuleCancel");
    if (!open || !form) return;
    open.addEventListener("click", () => {
      open.classList.add("hidden");
      form.classList.remove("hidden");
      $("#moduleName").focus();
    });
    if (cancel) {
      cancel.addEventListener("click", () => {
        form.reset();
        form.classList.add("hidden");
        open.classList.remove("hidden");
      });
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = $("#moduleName").value.trim();
      const url = normalizeUrl($("#moduleUrl").value);
      if (!name || !url) {
        toast(t("moduleInvalidUrl"));
        return;
      }
      const items = readCustomModules();
      items.push({ name, url });
      writeCustomModules(items);
      renderCustomModules();
      form.reset();
      form.classList.add("hidden");
      open.classList.remove("hidden");
      toast(t("moduleAdded"));
    });
    renderCustomModules();
  }

  function staticModuleId(card, index) {
    const title = card.querySelector("h3");
    const raw = `${index}-${title ? title.textContent : ""}-${card.getAttribute("href") || ""}`;
    return raw.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  }

  function readDeletedStaticModules() {
    try {
      const parsed = JSON.parse(localStorage.getItem("homepage-deleted-static-modules") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeDeletedStaticModules(items) {
    localStorage.setItem("homepage-deleted-static-modules", JSON.stringify(items));
  }

  function initStaticModuleDelete() {
    const deleted = new Set(readDeletedStaticModules());
    $$(".cards > .link-card").forEach((card, index) => {
      if (card.id === "esp32ModuleOpen") return;
      if (card.id === "storageModuleOpen") return;
      if (card.id === "addModuleOpen" || card.id === "addModuleForm") return;
      if (card.closest("#customModules")) return;
      const id = staticModuleId(card, index);
      card.dataset.staticModuleId = id;
      if (deleted.has(id)) {
        card.remove();
        return;
      }
      const remove = document.createElement("button");
      remove.className = "module-delete";
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Delete module");
      remove.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!confirm(t("moduleDeleteConfirm"))) return;
        const next = new Set(readDeletedStaticModules());
        next.add(id);
        writeDeletedStaticModules(Array.from(next));
        card.remove();
        toast(t("moduleDeleted"));
      });
      card.appendChild(remove);
    });
  }

  async function refreshEsp32Status() {
    const online = $("#espOnline");
    if (!online) return;
    try {
      const response = await fetch("/api/public/device/state", { cache: "no-store" });
      if (!response.ok) throw new Error("status " + response.status);
      const data = await response.json();
      online.textContent = data.online ? t("online") : t("offline");
      online.style.color = data.online ? "var(--mint)" : "var(--hot)";
      $("#espIp").textContent = esp32Authenticated ? (data.ip || "-") : t("espIpHidden");
      $("#espRssi").textContent = data.rssi ? data.rssi + " dBm" : "-";
      if (data.heap && data.heapTotal && Number(data.heapTotal) > 0) {
        $("#espHeap").textContent = Math.round(Number(data.heap) * 100 / Number(data.heapTotal)) + "%";
      } else {
        $("#espHeap").textContent = data.heap ? data.heap + " bytes" : "-";
      }
    } catch (error) {
      online.textContent = t("unreadable");
      online.style.color = "var(--hot)";
    }
  }

  initLoading();
  initLanguage();
  initClock();
  initScroll();
  initTheme();
  initContextMenu();
  initPlayer();
  initTerminal();
  const startParticles = () => initParticles();
  if ("requestIdleCallback" in window) {
    requestIdleCallback(startParticles, { timeout: 3000 });
  } else {
    setTimeout(startParticles, 1800);
  }
  initVisits();
  initSearchShortcut();
  initStaticModuleDelete();
  initCustomModules();
  initEsp32ModuleOpen();
  initStorageModuleOpen();
  initEsp32Unlock();
})();
