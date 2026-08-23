<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Deploy Configuration (configured by /setup-deploy)

- Platform: Vercel
- Production URL: https://ai-transformation-os.vercel.app
- Deploy workflow: automatic on push to `main`
- Deploy status command: `npx vercel inspect --scope bekhzod1990s-projects`
- Merge method: squash
- Project type: web app and API
- Post-deploy health check: https://ai-transformation-os.vercel.app

### Custom deploy hooks

- Pre-merge: `corepack pnpm verify`
- Deploy trigger: automatic on push to `main`
- Deploy status: poll the Vercel deployment URL
- Health check: `GET /`
