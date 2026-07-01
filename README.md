# PZQ Personal Web

一个 Windows 本地个人服务器项目，包含个人主页、ESP32 远程模块、文件存储模块、音乐播放和 Cloudflare Tunnel 可选公网访问。

## 快速启动

在项目根目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File server\Start-PersonalWeb.ps1
```

打开：

```text
http://127.0.0.1:18080/
```

也可以双击根目录的 `启动网站.bat`。

## 安装包

已支持生成 Windows 自解压安装包：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File installer\Build-Installer.ps1
```

输出文件：

```text
dist\PZQPersonalWeb-Setup.exe
```

安装后会复制网站文件到 `%LOCALAPPDATA%\PZQPersonalWeb`，并创建启动服务器和打开网站的快捷方式。

## 配置说明

运行数据和敏感信息不进入 Git：

- `dynamic/`：账号、上传文件、ESP32 状态、日志、设备 token
- `server/cloudflared-config.yml`：本机 Cloudflare Tunnel 配置
- `dist/`、`build/`：安装包和构建产物

如果需要公网访问，请复制 `server/cloudflared-config.local.example.yml` 为 `server/cloudflared-config.local.yml`，填入自己的 Cloudflare Tunnel ID、凭据路径和域名。

## 最近更新

- 首页“常用入口”改为“功能模块”，并移除本地服务器卡片。
- 优化刷新速度：取消人为加载等待、延迟粒子动画、延迟音频加载。
- 增加静态文件缓存：`ETag`、`Last-Modified`、`immutable` 缓存头和 `/api/songs` 缓存。
- 支持便携部署：服务根目录改为脚本相对路径，不再依赖固定磁盘路径。
- 增加 Windows 安装包构建脚本，安装后可通过快捷方式启动服务器。
- Watchdog 改为连续失败后再重启，减少刷新时遇到 Bad Gateway 的概率。
- GitHub 安全处理：运行数据、构建产物、本机 Cloudflare 配置和真实设备 token 已排除。

## 目录结构

```text
server/      PowerShell 本地 HTTP 服务、启动脚本和巡检脚本
static/      首页、样式、脚本、图片和音乐资源
installer/   安装包构建脚本
firmware/    ESP32-S3 固件源码和 OTA 文件位置
dynamic/     本地运行数据，已被 Git 忽略
```

## 版本控制

建议使用语义化版本：

```text
v0.1.0 - 当前可安装、可便携部署版本
```

提交前检查：

```powershell
git status --short
git diff --check
```
