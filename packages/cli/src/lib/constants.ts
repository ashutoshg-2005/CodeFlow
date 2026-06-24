/**
 * Configuration constants for CodeFlow.
 */

export const CONFIG_DIR_NAME = ".codeflow";

/**
 * Public client-side configuration.
 *
 * These are baked-in production defaults so the globally-installed CLI works
 * with zero setup. They can be overridden via environment variables (or a
 * `.env` in the current directory) for local development against your own
 * server / Clerk instance.
 *
 * All three values are public, client-side identifiers (a server URL, a Clerk
 * Frontend API origin, and a public OAuth client id) — no secrets are embedded.
 */
export const API_URL =
  process.env.API_URL ?? "https://codeflowserver-production.up.railway.app";

export const CLERK_FRONTEND_API =
  process.env.CLERK_FRONTEND_API ?? "https://large-quetzal-57.clerk.accounts.dev";

export const CLERK_OAUTH_CLIENT_ID =
  process.env.CLERK_OAUTH_CLIENT_ID ?? "l2d6jgUmcuuhIzZq";
