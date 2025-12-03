This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## MCP Integration

The repo contains ready-to-use configuration for the [shadcn MCP server](https://ui.shadcn.com/docs/mcp), so AI IDEs can browse and install components from the configured registries:

- `.mcp.json` — Claude Code reads this file automatically. Restart Claude after running `npx shadcn@latest mcp init --client claude` in the project.
- `.cursor/mcp.json` — Cursor consumes the same MCP server definition; enable the server in Cursor Settings after running `npx shadcn@latest mcp init --client cursor`.
- `.vscode/mcp.json` — VS Code (Copilot Chat) lists the shadcn MCP server under the Copilot MCP view; click **Start** after running `npx shadcn@latest mcp init --client vscode`.

For Codex, the CLI cannot edit `~/.codex/config.toml` automatically. Run `npx shadcn@latest mcp init --client codex` and copy the printed `[mcp_servers.shadcn]` block into your Codex config manually, then restart the client.

## Database Access

The `docker-compose.yml` stack now includes an Adminer instance (`db-ui` service) for managing the PostgreSQL database:

1. Run `docker compose up` (or `docker compose up db db-ui`) and wait for the `db` health check to pass.
2. Open [http://localhost:8080](http://localhost:8080) in your browser.
3. Use the following credentials to sign in:
   - **System:** PostgreSQL
   - **Server:** `db`
   - **Username:** `tipsio`
   - **Password:** `tipsio_password`
   - **Database:** `tipsio`

Once inside Adminer you can inspect tables, run SQL queries, or edit records directly.
