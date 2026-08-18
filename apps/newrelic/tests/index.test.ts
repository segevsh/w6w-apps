import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 17 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 17);
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

/** Only recording a deployment makes a new thing each time. */
Deno.test("index: the action that duplicates on a retry says so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["deployment-create"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["user-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "reporting", "quota"]);
});

/** Both regions, plus the status host for the service check. */
Deno.test("index: the manifest names both regional endpoints", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api.newrelic.com",
    "api.eu.newrelic.com",
    "status.newrelic.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.newrelic");
  assertEquals(manifest.w6w.categories, ["monitoring", "analytics", "devops"]);
});

/**
 * NerdGraph puts failures inside HTTP 200, so nothing may decide success from
 * the status code — every action must go through the client.
 */
Deno.test("index: no action reads res.ok or an HTTP status", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/\.ok\b/.test(src), `${entry.name} reads res.ok — NerdGraph errors arrive in a 200`);
    assert(!/\.status\s*===\s*\d/.test(src), `${entry.name} branches on an HTTP status code`);
  }
});

/**
 * Every mutation must handle the third error level — its own payload's errors,
 * inside `data`, with no GraphQL error to notice.
 */
Deno.test("index: every mutation reads its own payload errors", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    // The raw escape hatch documents that the caller must do this itself.
    if (entry.name === "graphql-query.ts") continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    if (!/mutation\s*\(/.test(src)) continue;
    // Three shapes exist: an `errors` list, a single `error`, and — for
    // changeTracking — no error payload at all, where the only confirmation is
    // that an id came back.
    assert(
      /mutationErrors\(/.test(src) || /\?\.error;/.test(src) ||
        /returned no deployment id/.test(src),
      `${entry.name} sends a mutation without confirming it did anything`,
    );
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
    assert(!/\bapiKey\b/i.test(src), `${entry.name} handles the key`);
  }
});

/**
 * NRQL results are production telemetry and an issue title describes an
 * outage. A run log records counts, ids and shapes.
 */
Deno.test("index: no action logs query text, results or issue titles", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /\bquery\s*[,:}]/i,
          /\bnrql\s*[,:}]/i,
          /\bresults\s*[,:}]/i,
          /\bissues\s*[,:}]/i,
          /\btitle\b/i,
          /\bvalues\s*[,:}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs telemetry: ${object}`);
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
