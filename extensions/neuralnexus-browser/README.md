# NeuralNexus Capture

Chromium Manifest V3 extension for explicit capture workflows.

## Privacy model

- No browsing history permission.
- No `<all_urls>` host permission by default.
- No background scraping.
- No passive page monitoring.
- Captures are sent only after the user clicks a NeuralNexus action.
- Screenshots and raw text stay in the Personal Vault endpoint.
- Nexus Index contribution remains opt-in and receives only minimized previews through the main app protocol.

## Local setup

1. In NeuralNexus, create an extension token:

   ```bash
   curl -X POST http://localhost:3000/api/extension/token
   ```

2. Build the extension:

   ```bash
   npm run build
   ```

3. Load `extensions/neuralnexus-browser/dist` as an unpacked extension in Chrome, Edge or Brave.

4. Open the extension popup and set:
   - App URL: `http://localhost:3000`
   - Capture token: the token from step 1

## Permissions

The extension requests only `activeTab`, `storage`, `contextMenus`, `scripting` and `sidePanel`. Optional host permissions are declared for explicit future site activation, not background capture.
