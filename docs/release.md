# Release Guide

This is the reusable process for developing a change, merging it to `main`, and publishing macOS and Windows binaries to GitHub Releases.

## Repository

- The public source and release repository is `turboxing/ChatTransfer`.
- `main` is the only long-lived branch and must remain releasable.
- Use GitHub Flow: short-lived branches, pull requests, CI, review, merge, delete branch.
- Do not reference the transitional private source repository in public documentation.

## 1. Develop a Change

Start from the latest `main`:

```bash
git switch main
git pull github main
git switch -c feature/your-feature
```

Use these branch prefixes:

- `feature/` for new functionality
- `fix/` for bug fixes
- `docs/` for documentation-only changes
- `hotfix/` for urgent production fixes

While developing:

1. Keep the change focused.
2. Add or update tests for behavior changes.
3. Update user-facing documentation when needed.
4. Keep Socket.IO event names and payload shapes backward compatible unless a migration is planned.

Validate locally before opening a pull request:

```bash
npm test
cd frontend && npm run build
```

Commit and push the branch:

```bash
git add .
git commit -m "feat: add your feature"
git push -u github feature/your-feature
```

Open a pull request to `main`, wait for CI to pass, request review, merge, and delete the branch.

## 2. Choose the Next Version

Use semantic versioning:

- **Patch**, such as `2.0.9.3`, for bug fixes, documentation, CI changes, or internal improvements.
- **Minor**, such as `2.0.10.0`, for new backward-compatible features.
- **Major**, such as `3.0.0`, for breaking changes or a major product migration.

Do not reuse a version that already has a tag or Release.

## 3. Update Release Files

After the feature branch merges, sync `main`:

```bash
git switch main
git pull github main
```

Update these files for the new version:

- `package.json`
- `package-lock.json`
- `frontend/src/data/changelog.js`
- `release/CHANGELOG.md`
- `release/CHANGELOG.en.md`
- `release/CHANGELOG.ar.md`
- `release/releases.json`

Recommended command after editing `package.json`:

```bash
npm install --package-lock-only
```

If tests contain explicit version assertions, update them as part of the release commit.

## 4. Validate the Release Candidate

Run:

```bash
npm run release:check
npm test
cd frontend && npm run build
```

`release:check` verifies that a tag for the current `package.json` version does not already exist.

For an extra packaging check before tagging:

```bash
npx pkg package.json -t node18-macos-x64 --output /tmp/ChatTransfer-pkg-check
```

## 5. Commit and Tag

Commit the release preparation:

```bash
git add .
git commit -m "release: v2.0.9.3"
git push github main
```

Create and push the release tag:

```bash
git tag v2.0.9.3
git push github v2.0.9.3
```

Replace `2.0.9.3` with the actual release version.

## 6. Automated GitHub Release

Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml`.

The workflow automatically:

1. Installs root and frontend dependencies.
2. Runs tests.
3. Builds the frontend.
4. Packages macOS and Windows executables with `pkg`.
5. Creates `SHA256SUMS.txt`.
6. Publishes the GitHub Release with all assets.

Monitor the run:

```text
https://github.com/turboxing/ChatTransfer/actions
```

## 7. Release Verification

After the workflow succeeds:

1. Open the GitHub Release page.
2. Confirm the tag, version, and release notes are correct.
3. Confirm these assets exist:
   - `ChatTransfer-macos-x64-v<version_with_underscores>.zip`
   - `ChatTransfer-windows-x64-v<version>.exe.zip`
   - `SHA256SUMS.txt`
4. Download both binaries and perform a smoke test.
5. Verify the checksums:

```bash
shasum -a 256 -c SHA256SUMS.txt
```

## 8. Manual Packaging Fallback

Use this only if the automated release workflow is unavailable:

```bash
npm test
cd frontend && npm run build
cd ..
sh publish.sh all
```

Then create the GitHub Release manually and upload:

- The macOS zip
- The Windows zip
- `SHA256SUMS.txt`

Do not commit generated binaries in `dist/`.

## 9. Failed or Incorrect Releases

- If the workflow fails before publishing, fix the issue on `main`, delete the unpublished tag, re-tag, and push again.
- If a Release is already published, prefer issuing a new patch release instead of rewriting the tag.
- Never rewrite a tag that users may already depend on.

## Asset Naming

- macOS executable: `ChatTransfer-macos-x64-v<version_with_underscores>`
- macOS archive: `ChatTransfer-macos-x64-v<version_with_underscores>.zip`
- Windows executable: `ChatTransfer-windows-x64-v<version>.exe`
- Windows archive: `ChatTransfer-windows-x64-v<version>.exe.zip`
- Checksums: `SHA256SUMS.txt`

## Final Checklist

- `main` is clean and up to date.
- All tests pass.
- Frontend build succeeds.
- Version is updated consistently.
- Changelog and release metadata are updated.
- Tag matches `package.json`.
- GitHub Actions release workflow succeeds.
- Release assets download successfully.
- Checksums match.
- No secrets, local configuration, logs, cache files, or generated binaries are committed.
