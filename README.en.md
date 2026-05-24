# ChatTransfer

> A minimal LAN instant messaging and file transfer tool. Scan to connect — no app installation, no registration required.

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

[中文](./README.md) | [العربية](./README.ar.md)

---

## Features

- **Scan to Connect** — Generates a QR code on startup; scan with your phone to open the chat in your browser
- **Real-time Group Chat** — Multiple users online simultaneously with instant message sync
- **File Transfer** — Send text, images, and files in seconds
- **Batch Upload** — Drag and drop multiple files at once
- **Pin Messages** — Pin important messages to the top for easy access
- **Top Messages** — Highlight key messages at the top of the chat
- **Chat History** — Local caching of chat history with clear option
- **Cross-platform** — Supports Windows and macOS
- **Multi-language** — Chinese and English interface

## Problems Solved & Value

- No more “temporary sharing is painful”: no login, no friend requests, just open and use
- Less device fragmentation: fast transfers across devices on the same LAN, fewer copy/paste round-trips
- More privacy control: no third-party cloud drive/IM involved by default

If you run into any issues or have feature ideas, please open an Issue in this repository. Feedback is highly appreciated and directly helps improve ChatTransfer.

## Quick Start

### Download

Go to the [Releases](../../releases) page and download the executable for your system:

| System | Filename |
|--------|----------|
| macOS (Intel) | `ChatTransfer-macos-x64-v{version_with_underscores}` (example: v2_0_8_8) |
| Windows | `ChatTransfer-windows-x64-v{version}.exe` |

### Run

1. Double-click the downloaded executable
2. A browser window will open automatically with a QR code
3. Scan the QR code with your phone to open the chat in your mobile browser
4. Type messages or upload files on either side — they sync in real time

### Tips

- Switch language (Chinese/English) in Settings
- Drag files onto the chat window for quick upload
- Press `/` twice to quickly focus the input box
- View changelog in the top-right Settings menu

## Changelog

Current version: **v2.0.8.8**

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
