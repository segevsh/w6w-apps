import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 14 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 14);
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

Deno.test("index: only creating an item duplicates on a retry", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, ["item-create"]);
});

/** Two credentials reaching two services, deliberately not combinable. */
Deno.test("index: exports both auth methods and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["connect-token", "events-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "surface", "quota"]);
});

/** The Connect server is self-hosted, so it can be anywhere. */
Deno.test("index: the manifest names the Events hosts and admits a self-hosted Connect", () => {
  assertEquals(manifest.w6w.network.allow, [
    "events.1password.com",
    "events.1password.eu",
    "events.1password.ca",
    "events.ent.1password.com",
    "status.1password.com",
    "*",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.onepassword");
  assertEquals(manifest.w6w.categories, ["security", "developer-tools"]);
});

/**
 * Reading a secret must be a deliberate act. `item-get` defaults to withholding
 * and `item-field-get` is the narrow path — if either changed, this fails.
 */
Deno.test("index: reading a secret stays deliberate", () => {
  const get = app.actions.find((a) => a.key === "item-get")!;
  const reveal = (get.params as Array<{ key: string; default?: unknown }>)
    .find((p) => p.key === "revealSecrets")!;
  assertEquals(reveal.default, false, "item-get would return secrets by default");

  const field = app.actions.find((a) => a.key === "item-field-get")!;
  const keys = (field.params as Array<{ key: string }>).map((p) => p.key);
  assert(keys.includes("field"), "the narrow path lost its single-field parameter");
});

/** There is no per-action auth binding, so every action must check its surface. */
Deno.test("index: every action asserts which surface it needs", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    assert(
      /requireConnect\(|requireEvents\(/.test(src),
      `${entry.name} does not check which surface the connection is for`,
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
    // The access patterns, not the bare word: these actions discuss credentials
    // constantly in their error messages, and prose is not a violation.
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${entry.name} reads the credential`,
    );
  }
});

/**
 * The guarantee this whole app rests on: a run log may record ids, labels and
 * counts, and never a secret value or the title that says what it is for.
 */
Deno.test("index: no action logs a field value, a title or a filename", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /\bvalue\b/i,
          /\btitle\b/i,
          /\bfields\s*[,:}]/i,
          /\bname\b/i,
          /\bitem\s*[,:}]/i,
          /\bvaults\s*[,:}]/i,
          /\boperations\s*[,:}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs secret-adjacent data: ${object}`);
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
