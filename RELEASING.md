# Releasing @foundrydb/sdk

## Prerequisites

Add the following secret to the GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret name | Value |
|-------------|-------|
| `NPM_TOKEN` | An npm access token with **Automation** or **Publish** permission for the `@foundrydb` scope. |

## Publishing a new version

1. Ensure `main` is in the state you want to release.
2. Create and push a version tag:

   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

3. The `Publish to npm` workflow triggers automatically, sets the package version from the tag, builds the TypeScript source, and runs `npm publish --access public`.

No source-file edits are needed; the version is applied ephemerally in CI via `npm version`.

## Manual trigger

You can also trigger the workflow manually from the GitHub Actions UI (`workflow_dispatch`) by supplying the tag name (e.g. `v1.2.3`).
