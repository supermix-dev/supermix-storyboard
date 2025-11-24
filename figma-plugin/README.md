# Supermix Storyboards Importer

This Figma plugin recreates the storyboard cards exported from the Supermix Storyboard app.

## Installation

1. Open Figma desktop.
2. Navigate to **Plugins → Development → Import plugin from manifest…**
3. Select this directory’s `manifest.json`.
4. The plugin now appears under **Plugins → Development → Supermix Storyboards Importer**.

## Workflow

1. In the Supermix Storyboard app, click **Export to Figma** and either copy the JSON or download the `.json` file.
2. In Figma, run **Plugins → Development → Supermix Storyboards Importer**.
3. Paste the copied JSON _or_ choose the downloaded file inside the plugin UI.
4. Click **Import**. The plugin lays out stylized frames for every storyboard on the current page.

Each frame includes:

- Sequential label and title
- Time range + optional duration
- Gradient placeholder block you can swap with actual artwork
- Original storyboard ID for traceability

You can re-run the plugin whenever the export changes; it always appends the newly generated frames so you can keep previous iterations if needed.
