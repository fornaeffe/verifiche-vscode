# Development instructions

- Read README.md and docs/ARCHITECTURE.md before changing the extension.
- Keep the extension independent of any personal content repository. Use synthetic
  fixtures in public tests, screenshots and documentation.
- Preserve untouched source text when implementing structural edits. Exercise IDs
  are relative paths without `.md`; do not reintroduce front-matter IDs.
- Run `npm test` and `npm run build` for changes to the domain or extension. Run the
  Extension Host integration suite when changing VS Code integration or the webview.
- Keep checkpoints in the private project plan when working with a separate data
  repository; do not copy private content or operational logs into this repository.
