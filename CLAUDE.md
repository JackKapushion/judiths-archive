# Softa's Archive

A memorial and document archive site for Judith Orloff, M.Ed. (Softa). Built with Vite, React, TypeScript, Tailwind CSS, and Firebase.

## Domain

- judithorloff.org (Namecheap)

## Document Source

- /Users/jack/Library/Mobile Documents/com~apple~CloudDocs/Softas docs/ (27 PDFs + 2 PNGs)

## Development Workflow

- Plans live in `/steps` as numbered markdown files (e.g., `01-project-setup.md`)
- Plans are implemented by Claude Code, not manually
- Plan numbers are sequential across all steps
- Plans should include: Goal, Requirements, Prerequisites (manual tasks for Jack), Step-by-step implementation plan (for Claude Code)
- Do NOT include a "Testing & Validation" section in plans

## Plan Review Process

- Start with a concise numbered list of issues found during review
- Explain one issue at a time (e.g., "Issue 1 of 5"), wait for "continue" between each
- Claude Code only starts implementing after an explicit "green light" from Jack

## Shell Commands

All shell commands (npm install, npm create vite, firebase deploy, etc.) are run by Jack, not by Claude Code. List them clearly in the Prerequisites section of each plan.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- Firebase (Auth with Google sign-in, Firestore, Hosting)
- react-pdf (by wojtekmaj) for PDF rendering

## File Conventions

- Lowercase filenames with dashes (kebab-case)
- Use `git mv` when moving files to preserve history
- File references use clickable `file_path:line_number` format

## Making Changes

- Scan for ALL similar instances and apply changes everywhere, not just the one pointed out
- Push back if something seems off or could cause issues
