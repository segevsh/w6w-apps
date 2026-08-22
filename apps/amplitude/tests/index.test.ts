import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 15 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 15);
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

/**
 * The ingest actions are idempotent only because they derive a stable
 * insert_id. An annotation has no deduplication at all.
 */
Deno.test("index: only the annotation duplicates on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["annotation-create"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-keys"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/** Two products, two regions — four hosts, plus the status page. */
Deno.test("index: the manifest names all four API hosts", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api2.amplitude.com",
    "api.eu.amplitude.com",
    "amplitude.com",
    "analytics.eu.amplitude.com",
    "status.amplitude.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.amplitude");
  assertEquals(manifest.w6w.categories, ["analytics", "marketing"]);
});

/**
 * Ids under five characters are removed rather than refused, so every action
 * that sends one must check before the request.
 */
Deno.test("index: both ingest actions guard the id length", () => {
  for (const key of ["event-track", "event-batch"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
    assert(keys.includes("minIdLength"), `${key} has no id-length escape hatch`);
  }
});

/** A retry is only safe because the id is derived from the payload. */
Deno.test("index: both ingest actions offer derived insert ids, defaulted on", () => {
  for (const key of ["event-track", "event-batch"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const derive = (action.params as Array<{ key: string; default?: unknown }>)
      .find((p) => p.key === "deriveInsertId")!;
    assertEquals(derive.default, true, `${key} does not derive insert ids by default`);
    assertEquals(action.idempotent, true);
  }
});

/** Erasure is irreversible, so it takes a deliberate second input. */
Deno.test("index: deleting users takes an acknowledgement", () => {
  const action = app.actions.find((a) => a.key === "user-delete")!;
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(keys.includes("confirmPermanentDeletion"), keys.join(","));
  assert(keys.includes("requester"), keys.join(","));
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

/**
 * Amplitude needs the credential in three different places, and all three are
 * the auth hook's job — an action putting `api_key` in a body would work and
 * would take the credential out of the one hook that is allowed to hold it.
 */
Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
    assert(!/api_key/i.test(src), `${entry.name} sets the api key itself`);
    assert(!/secretKey/i.test(src), `${entry.name} touches the secret key`);
  }
});

/**
 * Events, user properties and identifiers are what this product exists to
 * collect. A run log records counts and shapes.
 */
Deno.test("index: no action logs events, properties or identifiers", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /\bevents\s*[,:}]/i,
          /\buserId\b/i,
          /\buser_id\b/i,
          /\bproperties\s*[,:}]/i,
          /\bidentification\b/i,
          /\bevent\s*[,:}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs collected data: ${object}`);
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
