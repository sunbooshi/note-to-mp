# GEMINI.md - NoteToMP Obsidian Plugin

## Project Overview

This is an Obsidian plugin named **NoteToMP** designed to streamline the process of publishing notes to the WeChat Public Platform (微信公众号). It allows users to convert their Markdown notes into a styled HTML format that can be directly copied into the WeChat editor or sent as a draft, preserving formatting, code highlighting, and embedded images.

The project is built with **TypeScript** and bundled using **esbuild**. It uses the `marked` library for Markdown parsing and `highlight.js` for syntax highlighting. For features like image uploading and sending drafts, it communicates with a custom backend service (`https://obplugin.sunboshi.tech`) which acts as a proxy to the official WeChat API.

### Key Features:
- Renders Obsidian Markdown to styled HTML.
- Supports multiple themes and code highlight styles.
- Inlines CSS to ensure styles are preserved in the WeChat editor.
- Handles local and remote image uploads to the WeChat servers.
- Can send the final note as a draft directly to a configured WeChat Public Account.
- Supports advanced features like custom CSS, frontmatter for metadata (title, author, cover), and rendering of Mermaid and Excalidraw diagrams.

## Building and Running

The project uses `npm` for dependency management and `esbuild` for bundling.

### Dependencies
- **Production:** `marked`, `highlight.js`, `@zip.js/zip.js`, `html-to-image`
- **Development:** `typescript`, `esbuild`, `obsidian` types

### Key Scripts

- **Install dependencies:**
  ```bash
  npm install
  ```

- **Run in development mode:**
  This command bundles the plugin and watches for changes, rebuilding automatically. The output is `main.js` with an inline sourcemap.
  ```bash
  npm run dev
  ```

- **Build for production:**
  This command type-checks the code with `tsc` and then creates a production-ready bundle (`main.js`).
  ```bash
  npm run build
  ```

- **Download assets:**
  This script downloads theme and highlight assets required by the plugin.
  ```bash
  npm run download
  ```

## Development Conventions

### Code Style
- The project uses **ESLint** for linting and follows standard TypeScript best practices. The configuration is in `.eslintrc`.
- Code is formatted according to `.editorconfig`.

### Architecture
- **`src/main.ts`**: The main entry point for the plugin. It initializes the settings, registers the custom view (`NotePreview`), and adds ribbon icons and commands.
- **`src/note-preview.ts`**: Defines the custom `ItemView` that provides the UI for previewing the rendered note, including the toolbar and style selectors.
- **`src/article-render.ts`**: The core class responsible for the entire rendering pipeline. It uses `MarkedParser` to convert Markdown to HTML, applies styles, handles image processing, and orchestrates API calls.
- **`src/markdown/`**: Contains the custom Markdown parser logic, extending the `marked` library to support Obsidian-specific syntax like callouts, wikilinks, and embeds.
- **`src/weixin-api.ts`**: A dedicated module for all interactions with the backend service and the WeChat API. It handles authentication (token retrieval), image uploads, and draft creation.
- **`src/settings.ts` & `src/setting-tab.ts`**: Manage the plugin's configuration and the user interface for the settings tab.
- **`src/assets.ts`**: Manages loading and accessing theme and code highlight CSS files.

### Contribution
The project structure is modular, with a clear separation of concerns between the UI, rendering logic, and API interactions. When adding features, follow the existing pattern:
1.  Update settings in `src/settings.ts` if new configuration is needed.
2.  Modify the rendering logic in `src/article-render.ts` or the Markdown parser in `src/markdown/`.
3.  Add UI elements to `src/note-preview.ts`.
4.  If interacting with the WeChat API, add functions to `src/weixin-api.ts`.
