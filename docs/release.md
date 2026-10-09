# Release Guide

## Repository

The sole open-source and release repository is `turboxing/ChatTransfer`. Do not reference a transitional private source repository in public documentation.

## Release Preparation

```bash
npm test
cd frontend && npm run build
npm run release:check
```

`release:check` verifies that a tag for the current `package.json` version does not already exist.

## Release Process

1. Ensure the release is clean, tested and documented.
2. Update the version in `package.json`.
3. Update changelog data and generated release metadata.
4. Create a tag: `v<package-version>`.
5. Push the tag to GitHub.
6. GitHub Actions runs tests, builds the frontend and creates a draft Release.
7. Upload platform assets and checksums, then publish the Release.

## Asset Naming

- macOS: `ChatTransfer-macos-x64-v<version_with_underscores>`
- Windows: `ChatTransfer-windows-x64-v<version>.exe`
- Checksums: `SHA256SUMS.txt`

## Verification

- Tag and `package.json` version match.
- Assets download successfully.
- Each asset has a SHA256 checksum.
- macOS and Windows install instructions work for the packaged build.
- No sensitive files or transitional private repository references are included.
