import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { url?: string }; darkMode?: { icon: { url?: string } } };
  };
};

Deno.test("index: exports 20 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 20);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform", "trigger"].includes(a.type),
      `${a.key} has type ${a.type}`,
    );
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that starts another run. Pausing and testing are safe to repeat. */
Deno.test("index: the actions that start work say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["connection-resync", "connection-sync", "transformation-run"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "connections", "quota"]);
});

Deno.test("index: the manifest names only the API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.fivetran.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.fivetran");
});

/**
 * The distinction that costs money: an incremental sync is routine, a
 * historical re-sync re-bills every row in the source.
 */
Deno.test("index: re-syncing is gated and ordinary syncing is not", () => {
  const resync = app.actions.find((a) => a.key === "connection-resync")!;
  const confirm = (resync.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "connection-resync has no acknowledgement");
  assertEquals(confirm!.required, true);

  const sync = app.actions.find((a) => a.key === "connection-sync")!;
  const keys = (sync.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("confirm"), keys.join(","));
});

/**
 * Fivetran can delete connections, destinations, users and transformations.
 * Deleting a connection discards its sync state, so recreating it means a
 * historical re-sync — an expensive accident.
 */
Deno.test("index: nothing here deletes a connection, destination or user", () => {
  for (const a of app.actions) {
    assert(!/delete|remove|destroy/i.test(a.key), `${a.key} destroys something`);
  }
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint or an output label is not code. Concatenated
    // continuations count too, or half a two-line description survives.
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

/**
 * This app reads an account holding source credentials for every system a
 * company syncs. A run log records ids and counts.
 */
Deno.test("index: no action logs an address, a name or a config", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (const forbidden of [/\bemail\b/i, /\bconfig\b/i, /\bsecret\b/i, /\bpassword\b/i]) {
        assert(!forbidden.test(object), `${entry.name} logs sensitive data: ${object}`);
      }
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
