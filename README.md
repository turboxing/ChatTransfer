# ChatTransfer

[![GitHub Downloads](https://img.shields.io/github/downloads/turboxing/ChatTransfer/total?style=flat-square&amp;logo=github&amp;color=44cc11)![GitHub Release](https://img.shields.io/github/v/release/turboxing/ChatTransfer?style=flat-square&amp;color=fe7d37)](https://github.com/turboxing/ChatTransfer/releases)[![GitHub last commit](https://img.shields.io/github/last-commit/turboxing/ChatTransfer?style=flat-square&amp;color=a4a61d)](https://github.com/turboxing/ChatTransfer/commits/main)[![GitHub stars](https://img.shields.io/github/stars/turboxing/ChatTransfer?style=flat-square&amp;color=dfb317)](https://github.com/turboxing/ChatTransfer/stargazers)

&gt; A minimal, efficient LAN cross-device transfer tool designed specifically for **development** and **testing** scenarios. Scan to connect, supports real-time transfer of files, images, and text.

[中文](./README.zh-CN.md) | [العربية](./README.ar.md)

## Demo

📺 Watch the demo video on YouTube: [ChatTransfer Demo](https://www.youtube.com/watch?v=gZxeBqd7vbY)

🇨🇳 Bilibili Version (Chinese): [ChatTransfer Demo](https://www.bilibili.com/video/BV13QJp6vE3r/?vd_source=b4939bcf1ffecbca608b946bbdd9c475)

## Keywords

LAN transfer, file sharing, text sharing, image sharing, PC–phone transfer, chat-style sharing, developer tool, QA/testing helper, no-install, cross-platform (Windows/macOS), QR sharing, real-time communication, minimal IM.

Built for developers, testers, demos, and everyday work where you need to move content from one device to another quickly, especially:

- PC ↔ PC: share logs, config snippets, test builds, screenshots, and links during dev/testing
- PC ↔ Phone: send debug links/QR codes/screenshots to your phone, or transfer photos/videos back to your PC
- Phone ↔ Phone: quick sharing within a small team without installing complex IM or using cloud drives
- Live demos: share materials in meetings instantly, ready to use without adding contacts

Who it’s for:

- Developers / QA / Ops / PM: anyone frequently moving text, images, and files across devices
- Teams on a LAN: office intranet, labs, home networks, and other environments where going through the public internet is inconvenient

Privacy & data:

- Chat history and files are stored locally (on your device) and transferred only within the local network
- No third-party cloud service and no account system; content is not uploaded to any external server by default

## Why I Built This

I’m a QA engineer. In day-to-day work, I constantly move things between my laptop and test phones: app builds, test params, and links to the phone; then logs, screenshots, and screen recordings back to the laptop. I often hear teammates say:

- “How do I get that screen recording onto my computer?”
- “I need to install this test build on a phone — do I have to set up dev tools?”
- “Can we turn this image into a shareable link?”
- “Can this link (deep link) be turned into a QR code so I can just scan it with our app?”

These sound like small things, but when you need them right now they waste the most time. I want ChatTransfer to make these “quick share” moments effortless.

These needs are always “temporary”, but the usual solutions are heavy: install an IM app, sign in, upload to a third-party platform, worry about privacy, uninstall, and clean up borrowed devices. So I built ChatTransfer on weekends — a cross‑platform, no‑install, use‑and‑leave LAN transfer tool that makes this workflow simple and low‑friction. After iterating for about 2 years, it has proven effective across multiple real scenarios, so I decided to share it here.

I use it every day and keep iterating based on real scenarios. It will stay free. If you run into issues or have better ideas, please open an Issue — your feedback directly helps it grow.

[中文](./README.zh-CN.md) | [العربية](./README.ar.md)

***

## Features

- **Scan to Connect** — Generates a QR code on startup; scan with your phone to open the chat in your browser
- **Real-time Group Chat** — Multiple users online simultaneously with instant message sync
- **File Transfer** — Send text, images, and files in seconds
- **Batch Upload** — Drag and drop multiple files at once
- **Pin Messages** — Pin important messages to the top for easy access
- **Top Messages** — Highlight key messages at the top of the chat
- **Message QR Code** — Generate a QR code for any message for easy sharing
- **Chat History** — Local caching of chat history with clear option
- **Cross-platform** — Supports Windows and macOS
- **Multi-language** — Chinese and English interface

## Problems Solved & Value

- No more “temporary sharing is painful”: no login, no friend requests, just open and use
- Less device fragmentation: fast transfers across devices on the same LAN, fewer copy/paste round-trips
- More privacy control: no third-party cloud drive/IM involved by default

## Quick Start

### Download

Go to the [Releases](../../releases) page and download the package for your system:

| System  | Filename                                                                    |
| ------- | --------------------------------------------------------------------------- |
| macOS   | `ChatTransfer-macos-x64-v{version_with_underscores}` (example: v2\_0\_8\_9) |
| Windows | `ChatTransfer-windows-x64-v{version}.exe`                                   |

### Install & Run

**Windows**

1. Download the Windows executable
2. Double-click to run
3. If Windows shows a security prompt, choose “Run anyway”

**macOS**

1. Download the macOS executable and move it to your preferred location (e.g., Applications)
2. On first launch, if macOS says it can’t verify the developer, click “Cancel”
3. Open System Settings → Privacy & Security → in the Security section, click “Allow Anyway” and enter your password
4. Go back to the file and open it again; when prompted, click “Open”

### Tips

- Switch language (Chinese/English) in Settings
- Drag files onto the chat window for quick upload
- Press `/` twice to quickly focus the input box
- View changelog in the top-right Settings menu

## Changelog

See [CHANGELOG.en.md](./CHANGELOG.en.md) for the full changelog.

## System Requirements

- macOS 10.15+ or Windows 10+
- No Node.js or other dependencies required

## FAQ

**Q: The page won't open after scanning the QR code?**
A: Make sure your phone and computer are on the same local network.

**Q: File transfer failed?**
A: Check if the file size exceeds the limit, or try uploading again.

**Q: How do I switch languages?**
A: Click the Settings icon in the top-right corner and choose your language.

## License

ISC License

## Author

created by suncx
