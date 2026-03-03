# Markdown Annotator

A lightweight markdown reader and annotator PWA built with React, TypeScript, and Tailwind CSS.

See the deployed site at [mdnotes.co](https://mdnotes.co).

## Features

- **Markdown rendering** with syntax highlighting via `react-markdown` and `remark-gfm`
- **Text annotations** — select text in the rendered view to add highlights and notes
- **File management** — create, import, rename (double-click), and delete `.md` files
- **Editor mode** — edit raw markdown with auto-save (toggle with `Cmd/Ctrl+E`)
- **Collapsible panels** — both the file sidebar and annotation panel collapse smoothly
- **Offline storage** — all files and annotations persist in IndexedDB
- **Dark theme** — zinc color palette throughout

## Getting Started

```bash
npm install
npm run dev
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- IndexedDB (via `idb`)
- react-markdown + remark-gfm
