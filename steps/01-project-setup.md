# Step 01: Project Setup

## Goal

Set up a fresh Vite + React project with TypeScript and Tailwind CSS. Clean slate ready for feature work.

## Requirements

- Fresh Vite + React app with TypeScript, Tailwind CSS
- Git initialized and pushed to GitHub
- Default boilerplate cleaned up

## Prerequisites (Jack does these manually)

1. Run from `/Users/jack/projects/softas-site/`:
   - `npm create vite@latest . -- --template react-ts`
   - `npm install`
   - `npm install -D tailwindcss @tailwindcss/vite`
2. `git init && git remote add origin https://github.com/JackKapushion/softas-site.git`

## Step-by-Step Implementation Plan (Claude Code)

### 1. Configure Tailwind CSS

Add the Tailwind plugin to `vite.config.ts` and replace the contents of `src/index.css` with the Tailwind import (`@import "tailwindcss"`).

### 2. Clean up default Vite boilerplate

- Replace `src/App.tsx` with a simple placeholder that confirms the app is running
- Remove default Vite/React boilerplate files (`src/App.css`, `src/assets/react.svg`, etc.)
- Clean up `index.html` (update title to "Softa's Archive")

### 3. Update `.gitignore`

Add `.env.local` and any other project-specific ignores (node_modules and dist should already be there from Vite scaffolding).
