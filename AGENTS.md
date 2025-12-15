# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

This is an Obsidian plugin called "NoteToMP" that allows users to copy notes to WeChat MP (WeChat Official Accounts Platform) editor while preserving note styles. It supports code highlighting, line numbers, local image uploads, and mathematical formulas. The plugin also supports publishing directly to WeChat MP drafts.

## Key Directories and Files

- `src/main.ts`: Main plugin entry point
- `src/note-preview.ts`: Main preview view component
- `src/settings.ts`: Plugin settings management
- `src/ui/`: React-based UI components
- `src/store/`: Zustand-based state management
- `src/markdown/`: Markdown parsing and processing
- `src/assets.ts`: Asset management (themes, highlights)
- `esbuild.config.mjs`: Build configuration
- `package.json`: Dependencies and scripts

## Development Commands

- `npm run dev`: Start development mode with file watching
- `npm run build`: Build production version
- `npm run download`: Download assets (themes and highlights)

## Architecture Overview

The plugin follows a modern React-based architecture with Zustand for state management:

1. **Main Plugin Class** (`src/main.ts`): Initializes the plugin, registers views, commands, and settings
2. **Preview View** (`src/note-preview.ts`): Main UI component for previewing and publishing notes
3. **React UI** (`src/ui/`): Modern React components using Radix UI primitives
4. **State Management** (`src/store/`): Zustand stores for managing plugin and render state
5. **Markdown Processing** (`src/markdown/`): Custom markdown parser using Marked.js
6. **Asset Management** (`src/assets.ts`): Handles themes, code highlights, and other assets
7. **WeChat Integration** (`src/weixin-api.ts`): API integration with WeChat Official Accounts Platform

The plugin uses a component-based architecture with clear separation of concerns between UI, business logic, and state management.