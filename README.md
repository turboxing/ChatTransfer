# ChatTransfer

[![GitHub Downloads](https://img.shields.io/github/downloads/turboxing/ChatTransfer/total?style=flat-square&logo=github&color=44cc11)](https://github.com/turboxing/ChatTransfer/releases)
[![GitHub Release](https://img.shields.io/github/v/release/turboxing/ChatTransfer?style=flat-square&color=fe7d37)](https://github.com/turboxing/ChatTransfer/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/turboxing/ChatTransfer?style=flat-square&color=a4a61d)](https://github.com/turboxing/ChatTransfer/commits/main)
[![GitHub stars](https://img.shields.io/github/stars/turboxing/ChatTransfer?style=flat-square&color=dfb317)](https://github.com/turboxing/ChatTransfer/stargazers)
[![MIT License](https://img.shields.io/github/license/turboxing/ChatTransfer?style=flat-square&color=007ec6)](./LICENSE)

English | [简体中文](./README.zh-CN.md) | [العربية](./README.ar.md)

> A minimal LAN chat and file-transfer tool for developers, testers, and small teams. Scan a QR code, open a browser, and share text, images, and files instantly—without accounts, cloud uploads, or extra apps.

## Demo

- [YouTube demo](https://www.youtube.com/watch?v=gZxeBqd7vbY)
- [Bilibili demo](https://www.bilibili.com/video/BV13QJp6vE3r/?vd_source=b4939bcf1ffecbca608b946bbdd9c475)

## Why ChatTransfer

I am a QA engineer. In my daily work, I constantly move things between my computer and test phones: builds, test parameters, and links go to the phone; logs, screenshots, and screen recordings come back to the computer. Colleagues often ask:

- “How do I get that screen recording onto my computer?”
- “Do I need to set up dev tools to install this test build on a phone?”
- “Can you turn this image into a link?”
- “Can this link become a QR code?”

These sound like small things, but they cost the most time exactly when you need them right now. I want ChatTransfer to make these “quick share” moments simple enough.

These needs are always “temporary,” but the usual solutions are heavy: install an IM app, sign in, upload to a third-party platform, worry about privacy after sharing, uninstall it, and restore borrowed test phones. After repeating that cycle too many times, I built ChatTransfer on weekends: a cross-platform, no-install, use-and-leave LAN transfer tool that keeps temporary cross-device sharing simple, controllable, and lightweight. After nearly 3 years of iteration, ChatTransfer has proven effective in many real scenarios, so I decided to share it here.

I use it every day and keep improving it based on real scenarios. It will stay free. If you run into a problem or have a better idea, please open an Issue; your feedback directly helps it grow.

## Features

- **Scan to connect** — generate a QR code on startup and open the chat in a phone browser.
- **Real-time group chat** — multiple users can join the same LAN room and sync instantly.
- **File transfer** — send text, images, and files in seconds.
- **Batch upload** — drag and drop multiple files at once.
- **Pin and highlight messages** — keep important messages visible.
- **Message QR codes** — turn any message into a QR code for easy sharing.
- **Local chat history** — cache messages locally and clear them when needed.
- **Cross-platform** — supports Windows and macOS.
- **Multi-language UI** — Chinese and English.

## Use Cases

- **PC ↔ PC** — share logs, config snippets, test builds, screenshots, and links.
- **PC ↔ Phone** — send debug links, QR codes, and screenshots to phones; return photos and recordings to computers.
- **Phone ↔ Phone** — share files quickly in a small team without installing another IM app.
- **Live demos** — distribute materials instantly during meetings.

## Download and Install

Download the latest executable from the [Releases](https://github.com/turboxing/ChatTransfer/releases) page.

| System | File |
|--------|------|
| macOS | `ChatTransfer-macos-x64-v{version_with_underscores}` |
| Windows | `ChatTransfer-windows-x64-v{version}.exe` |

### Windows

1. Download the Windows executable.
2. Double-click to run it.
3. If Windows shows a security prompt, choose **Run anyway**.

### macOS

1. Download the macOS executable and move it to your preferred location.
2. If macOS says it cannot verify the developer, click **Cancel**.
3. Open **System Settings → Privacy & Security**, click **Allow Anyway**, and enter your password.
4. Open the app again and confirm with **Open**.

After the app starts, a browser window opens automatically with a QR code. Scan it with your phone to join the chat.

## Run from Source

### Requirements

- Node.js 20+
- npm 9+

### Commands

```bash
npm install
cd frontend
npm install
cd ..
npm run dev
```

The app starts at `http://localhost:55555`.

For frontend development:

```bash
cd frontend
npm run dev
```

### Test and Build

```bash
npm test
cd frontend
npm run build
```

### Package

```bash
sh publish.sh mac
sh publish.sh win
sh publish.sh all
```

Packaged files are written to `dist/`.

## Platform Support

- macOS 10.15+
- Windows 10+
- Any modern browser on desktop or mobile
- Prebuilt executables require no Node.js or additional dependencies

## Architecture

ChatTransfer uses a small, focused stack:

- **Frontend:** Vue 3, Vite, Vue Router, Element Plus, and Socket.IO Client.
- **Backend:** Node.js, Express, Socket.IO, and `express-fileupload`.
- **Packaging:** `pkg` for standalone macOS and Windows executables.

### Project Structure

```text
ChatTransfer/
├── server/       # Express API, Socket.IO events, services, telemetry
├── frontend/     # Vue 3 application
├── tests/        # Backend and repository-level tests
├── docs/         # Development, release, and telemetry guides
├── release/      # Release-page documentation and changelogs
└── publish.sh    # Packaging script
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for more details.

## Privacy and Security

- Chat history and files are stored locally on your device.
- Transfers stay inside your local network.
- There is no account system and no built-in cloud storage.
- Telemetry is disabled by default and never contains a provider key.
- If you enable telemetry, you must provide your own API key in `config/local.json`; without a key, ChatTransfer makes no external telemetry request.

See [docs/telemetry.md](./docs/telemetry.md) for details.

## Development

- [Development guide](./docs/development.md)
- [Release guide](./docs/release.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

## FAQ

**The page will not open after scanning the QR code.**
Make sure your phone and computer are on the same local network.

**File transfer failed.**
Check whether the file exceeds the configured size limit, then try uploading again.

**How do I switch languages?**
Open **Settings** in the top-right corner and choose your language.

## Changelog

See [release/CHANGELOG.en.md](./release/CHANGELOG.en.md).

## License

[MIT License](./LICENSE)

## Author

Created by suncx.
