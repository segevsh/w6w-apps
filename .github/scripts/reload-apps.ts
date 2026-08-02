/**
 * CI entrypoint for `packages/apps`'s reload workflow (F-1,
 * `.ai/projects/backlog/26-08-02-00-apps-push-frontend-redeploy.md`) — invoked by
 * `.github/workflows/reload-apps.yml` on every push to `main`, so a push to this repo goes live
 * with no human step in between.
 *
 * One credential family, `OPS_JWT_SECRET` — the same signing key `packages/frontend`'s CI already
 * holds as a secret for the exact same purpose (minting a short-lived ops JWT). Every request this
 * script makes goes through the `/system-ops` machine-to-machine edge; there is no `/auth/login`
 * call and no operator username/password anywhere in this file. Two scopes come off that one
 * secret: `apps:reload` (`system-ops.ts`'s `APPS_RELOAD_SCOPE`) for the catalog calls below, and
 * `deploy:frontend` (`DEPLOY_FRONTEND_SCOPE`) for the redeploy trigger — a token is minted FRESH,
 * scoped to exactly what the next call needs, right before each request (mirrors
 * `app-pages/src/api.ts`'s `mintOpsToken`: "minted fresh, seconds before use," never a long-lived
 * token held for the whole run).
 *
 * Two phases, run in order:
 *
 *   1. Walk every entry in `w6w-pack.json`, refresh-or-import it (D-1) against the `apps:reload`-
 *      scoped ops routes: `POST /system-ops/apps/:id/refresh` first (an already-registered app just
 *      needs re-resolving from its stored source ref — `force: true` busts the GitHub
 *      branch-tarball resolver cache, required since this repo is a moving `main` ref), falling
 *      back to `POST /system-ops/apps/import` on a 404 `unknown_app` (an id this catalog has never
 *      seen). Every entry is attempted even after an earlier one fails — the summary table at the
 *      end is the full picture, never just the first failure.
 *   2. Only if EVERY entry above succeeded: call `POST /system-ops/deploy-frontend` (F-3), scoped
 *      `deploy:frontend`, to kick the frontend rebuild. A partial catalog never reaches this step —
 *      see D-1's "no silent partial catalog" requirement.
 *
 * The JWT minting mirrors `packages/frontend/packages/app-pages/src/api.ts`'s `mintOpsToken` almost
 * verbatim (base64url alphabet — `+`/`/`/`=` stripped/translated, RFC 4648 §5 — HS256 over
 * `node:crypto`'s `createHmac`, the secret used only to SIGN and never sent as the bearer value
 * itself). The one difference is the extra `scope` claim `requireOpsScope` demands of every
 * write-capable child this script calls. Zero third-party deps, matching every other script in this
 * repo's `_tools/`: `node:crypto` and `node:buffer` are Deno-provided Node built-ins, never a
 * `deno.json` import.
 *
 * Usage: `deno run -A .github/scripts/reload-apps.ts` (also accepts `--pack <path>` to point at a
 * `w6w-pack.json` other than this repo's own root one — the default resolves from THIS script's
 * own `import.meta.url`, one directory up from `.github/scripts/`, never from `Deno.cwd()`, so it
 * behaves the same regardless of where the CI job's working directory happens to be).
 *
 * Required env (both, checked up front — a partial set is refused before any work starts, never
 * silently attempted): `W6W_API_URL`, `OPS_JWT_SECRET`. Names are pinned —
 * `.github/workflows/reload-apps.yml` reads them verbatim.
 */

import { createHmac } from "node:crypto";
import { Buffer } from "node:buffer";

// --------------------------------------------------------------------- config --

interface Config {
  apiUrl: string;
  opsSecret: string;
}

/** The two env vars this script requires — see the module doc's pinned-names note. */
const REQUIRED_ENV = ["W6W_API_URL", "OPS_JWT_SECRET"] as const;

/**
 * Read + validate the two required env vars. Missing ones are reported together (not one at a
 * time across retries) — "any is missing, print which one(s) and exit 1 immediately" is the
 * contract, so this is the one place that decides whether any work happens at all.
 */
function readConfig(): Config | null {
  const missing = REQUIRED_ENV.filter((name) => !Deno.env.get(name));
  if (missing.length > 0) {
    console.error(`reload-apps: missing required env var(s): ${missing.join(", ")}`);
    return null;
  }
  return {
    // No trailing-slash assumption downstream — every path below is built by string
    // concatenation onto this, never `new URL()` (see api.ts's own warning: `new URL` silently
    // drops a base path segment the moment the second argument starts a new path, which is
    // exactly the `SERVE_STUDIO=true` `/api` mount shape this could run against).
    apiUrl: Deno.env.get("W6W_API_URL")!.replace(/\/+$/, ""),
    opsSecret: Deno.env.get("OPS_JWT_SECRET")!,
  };
}

// ------------------------------------------------------------------ ops JWT --

/** The audience claim every ops route requires — pinned to `system-ops.ts`'s `OPS_AUDIENCE`. */
const OPS_AUDIENCE = "w6w:system-ops";
/** Scope for the catalog reload routes — pinned to `system-ops.ts`'s `APPS_RELOAD_SCOPE`. */
const APPS_RELOAD_SCOPE = "apps:reload";
/** Scope for the redeploy trigger — pinned to `system-ops.ts`'s `DEPLOY_FRONTEND_SCOPE`. */
const DEPLOY_FRONTEND_SCOPE = "deploy:frontend";
/** Minted fresh, seconds before use, for a SINGLE request — see the module doc. */
const OPS_TOKEN_TTL_SECONDS = 120;

/**
 * Base64url-encode (RFC 4648 §5): standard base64, then `+` → `-`, `/` → `_`, `=` padding
 * stripped entirely. Mirrors `app-pages/src/api.ts`'s `base64url` — getting this alphabet wrong
 * is the single most likely way to hand-roll a JWT that looks plausible and fails as a bare 401.
 */
function base64url(input: string | Uint8Array): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Mint a short-lived HS256 JWT carrying `aud: "w6w:system-ops"` and the given `scope`, signed with
 * `secret` — **never** send `secret` itself as the bearer value. Called fresh before EVERY request
 * this script makes, scoped to exactly what that one request needs; there is no single token held
 * for the whole run.
 */
function mintOpsToken(secret: string, scope: string, now: () => number = Date.now): string {
  const iat = Math.floor(now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { aud: OPS_AUDIENCE, scope, iat, exp: iat + OPS_TOKEN_TTL_SECONDS };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = base64url(createHmac("sha256", secret).update(signingInput).digest());
  return `${signingInput}.${signature}`;
}

// ---------------------------------------------------------------- pack loading --

/** One `w6w-pack.json` entry, resolved to a repo-relative path and its display name. */
interface PackEntryRef {
  /** e.g. "apps/airtable" — the pack-relative path, leading "./" and trailing "/" stripped. */
  relPath: string;
  /** e.g. "airtable" — `relPath`'s final segment, used for logging and the summary table. */
  name: string;
}

const DEFAULT_PACK_URL = new URL("../../w6w-pack.json", import.meta.url);

/** `--pack <path>` (relative to `Deno.cwd()`) overrides the default; otherwise unset. */
function resolvePackUrl(argv: string[]): URL {
  const flagIndex = argv.indexOf("--pack");
  const flagValue = flagIndex !== -1 ? argv[flagIndex + 1] : undefined;
  if (!flagValue) return DEFAULT_PACK_URL;
  return new URL(flagValue, `${toFileUrl(Deno.cwd())}/`);
}

function toFileUrl(path: string): string {
  return path.startsWith("file://") ? path : `file://${path}`;
}

function normalizeEntryPath(rawPath: string): string {
  return rawPath.replace(/^\.\//, "").replace(/\/+$/, "");
}

/** Parse `w6w-pack.json` into `{ relPath, name }` entries. Throws on any structural problem. */
async function loadPackEntries(packUrl: URL): Promise<PackEntryRef[]> {
  const text = await Deno.readTextFile(packUrl);
  const pack = JSON.parse(text) as { apps?: unknown };
  if (!Array.isArray(pack.apps)) {
    throw new Error(`${packUrl} has no "apps" array`);
  }
  return pack.apps.map((entry, i) => {
    const rawPath = (entry as { path?: unknown })?.path;
    if (typeof rawPath !== "string" || rawPath.length === 0) {
      throw new Error(`apps[${i}] has no "path" string`);
    }
    const relPath = normalizeEntryPath(rawPath);
    const name = relPath.split("/").pop() || relPath;
    return { relPath, name };
  });
}

/** Read `<packDir>/<relPath>/package.json` and pull out `w6w.id`. Throws on any problem. */
async function readAppId(packUrl: URL, entry: PackEntryRef): Promise<string> {
  const packageJsonUrl = new URL(`${entry.relPath}/package.json`, packUrl);
  let text: string;
  try {
    text = await Deno.readTextFile(packageJsonUrl);
  } catch (err) {
    throw new Error(`could not read ${entry.relPath}/package.json: ${(err as Error).message}`);
  }
  let pkg: { w6w?: { id?: unknown } };
  try {
    pkg = JSON.parse(text);
  } catch (err) {
    throw new Error(`${entry.relPath}/package.json is not valid JSON: ${(err as Error).message}`);
  }
  const id = pkg.w6w?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${entry.relPath}/package.json has no w6w.id`);
  }
  return id;
}

// ------------------------------------------------------------ refresh/import --

/**
 * `unknown_app` distinguishes "refresh 404'd because this id was never registered" (the signal to
 * fall back to import) from every other failure, which is a real error for that entry.
 */
type StepResult =
  | { kind: "ok"; detail: string }
  | { kind: "unknown_app" }
  | { kind: "error"; detail: string };

/**
 * `POST /system-ops/apps/:id/refresh`, `{ force: true }` — busts the resolver cache, per the
 * module doc. `apps:reload`-scoped ops token, minted fresh for this one call.
 */
async function refreshApp(cfg: Config, id: string): Promise<StepResult> {
  const token = mintOpsToken(cfg.opsSecret, APPS_RELOAD_SCOPE);
  const res = await fetch(`${cfg.apiUrl}/system-ops/apps/${encodeURIComponent(id)}/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ force: true }),
  });
  const body = await res.json().catch(() => ({}));
  const errorCode = (body as { error?: { code?: unknown } })?.error?.code;
  if (res.status === 404 && errorCode === "unknown_app") {
    return { kind: "unknown_app" };
  }
  if (!res.ok) {
    return { kind: "error", detail: `refresh failed: ${res.status} ${JSON.stringify(body)}` };
  }
  const b = body as { registered?: boolean; latestAdvanced?: boolean; bumped?: boolean };
  return {
    kind: "ok",
    detail: `refreshed (registered=${!!b.registered}, latestAdvanced=${!!b.latestAdvanced}, ` +
      `bumped=${!!b.bumped})`,
  };
}

/**
 * `POST /system-ops/apps/import` against this ONE app's subdirectory on GitHub — never the whole
 * pack, since the caller already resolved a single id from a single `w6w-pack.json` entry. Owner
 * scope is decided server-side now (the ops route always registers global/base-public — there is
 * no `owner` to pass, unlike the tenant-facing `/apps/import`). `apps:reload`-scoped ops token,
 * minted fresh for this one call. Handles the (here, never-taken) pack-shaped response defensively,
 * per the contract: `failed > 0` in that shape is a failure for this entry.
 */
type ImportResult = { kind: "ok"; detail: string } | { kind: "error"; detail: string };

async function importApp(cfg: Config, entry: PackEntryRef): Promise<ImportResult> {
  const source = `github:w6w-io/w6w-apps@main#${entry.relPath}`;
  const token = mintOpsToken(cfg.opsSecret, APPS_RELOAD_SCOPE);
  const res = await fetch(`${cfg.apiUrl}/system-ops/apps/import`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ source, refresh: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { kind: "error", detail: `import failed: ${res.status} ${JSON.stringify(body)}` };
  }
  const b = body as { kind?: string; registered?: number | boolean; failed?: number };
  if (b.kind === "pack") {
    const failed = typeof b.failed === "number" ? b.failed : 0;
    if (failed > 0) {
      return {
        kind: "error",
        detail: `import resolved as a pack with ${failed} failed entr${failed === 1 ? "y" : "ies"}`,
      };
    }
    return { kind: "ok", detail: `imported (pack shape, registered=${b.registered ?? 0})` };
  }
  return { kind: "ok", detail: `imported (registered=${!!b.registered})` };
}

type Action = "resolve" | "refresh" | "import";

interface Outcome {
  /** `null` only when id resolution itself failed (action "resolve") — no id to attempt against. */
  id: string | null;
  name: string;
  action: Action;
  ok: boolean;
  detail: string;
}

/** Refresh-or-import one entry: refresh first, import only on a confirmed `unknown_app` 404. */
async function processEntry(cfg: Config, id: string, entry: PackEntryRef): Promise<Outcome> {
  const refreshResult = await refreshApp(cfg, id);
  if (refreshResult.kind === "ok") {
    return { id, name: entry.name, action: "refresh", ok: true, detail: refreshResult.detail };
  }
  if (refreshResult.kind === "error") {
    return { id, name: entry.name, action: "refresh", ok: false, detail: refreshResult.detail };
  }
  const importResult = await importApp(cfg, entry);
  return {
    id,
    name: entry.name,
    action: "import",
    ok: importResult.kind === "ok",
    detail: importResult.detail,
  };
}

// ----------------------------------------------------------------- summary --

function printSummary(outcomes: Outcome[]): void {
  console.log("");
  console.log(
    `reload-apps: ${outcomes.length} entrie${outcomes.length === 1 ? "" : "s"} processed`,
  );
  const idWidth = outcomes.length
    ? Math.max(...outcomes.map((o) => (o.id ?? "(unresolved)").length))
    : 0;
  const nameWidth = outcomes.length ? Math.max(...outcomes.map((o) => o.name.length)) : 0;
  const actionWidth = outcomes.length ? Math.max(...outcomes.map((o) => o.action.length)) : 0;
  for (const o of outcomes) {
    const status = o.ok ? "OK  " : "FAIL";
    console.log(
      `  ${status}  ${(o.id ?? "(unresolved)").padEnd(idWidth)}  ${o.name.padEnd(nameWidth)}  ` +
        `${o.action.padEnd(actionWidth)}  ${o.detail}`,
    );
  }
  console.log("");
}

// ------------------------------------------------------------- deploy trigger --

/**
 * `POST /system-ops/deploy-frontend`. `deploy:frontend`-scoped ops token, minted fresh for this
 * one call. 202 (dispatched) and 200 (deduped — a redeploy was already queued recently) are both
 * success; any other status is thrown as a real error, body included.
 */
async function triggerFrontendDeploy(cfg: Config): Promise<void> {
  const token = mintOpsToken(cfg.opsSecret, DEPLOY_FRONTEND_SCOPE);
  const res = await fetch(`${cfg.apiUrl}/system-ops/deploy-frontend`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`deploy-frontend trigger failed: ${res.status} ${text}`);
  }
  let dispatched = false;
  try {
    dispatched = (JSON.parse(text) as { dispatched?: unknown }).dispatched === true;
  } catch {
    // Tolerated: the status was already 2xx, so a malformed body doesn't change the outcome —
    // it just means the "dispatched vs deduped" log line below can't be precise.
  }
  console.log(
    `reload-apps: frontend redeploy ${dispatched ? "dispatched" : "already queued (deduped)"}.`,
  );
}

// ------------------------------------------------------------------- main --

async function main(argv: string[]): Promise<number> {
  const cfg = readConfig();
  if (!cfg) return 1;

  const packUrl = resolvePackUrl(argv);
  let entries: PackEntryRef[];
  try {
    entries = await loadPackEntries(packUrl);
  } catch (err) {
    console.error(`reload-apps: could not read pack at ${packUrl}: ${(err as Error).message}`);
    return 1;
  }

  // Every entry is attempted, even after an earlier one fails — "no silent partial catalog"
  // means the summary below has to show the FULL picture, not just the first failure.
  const outcomes: Outcome[] = [];
  for (const entry of entries) {
    let id: string;
    try {
      id = await readAppId(packUrl, entry);
    } catch (err) {
      outcomes.push({
        id: null,
        name: entry.name,
        action: "resolve",
        ok: false,
        detail: (err as Error).message,
      });
      continue;
    }
    outcomes.push(await processEntry(cfg, id, entry));
  }

  printSummary(outcomes);

  const failures = outcomes.filter((o) => !o.ok);
  if (failures.length > 0) {
    console.error(
      `reload-apps: ${failures.length}/${outcomes.length} entries failed — NOT triggering a ` +
        `frontend redeploy.`,
    );
    return 1;
  }

  try {
    await triggerFrontendDeploy(cfg);
  } catch (err) {
    console.error(`reload-apps: ${(err as Error).message}`);
    return 1;
  }
  return 0;
}

if (import.meta.main) {
  try {
    Deno.exit(await main(Deno.args));
  } catch (err) {
    console.error(`reload-apps: unexpected failure — ${(err as Error).message}`);
    Deno.exit(1);
  }
}
