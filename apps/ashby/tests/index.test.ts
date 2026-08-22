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

Deno.test("index: exports 27 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 27);
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

/** Anything that creates a second record on a retry. */
Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["candidate-create", "candidate-note-create"]);
});

Deno.test("index: exports the one auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "permissions", "quota"]);
});

Deno.test("index: the manifest names only the API host", () => {
  assertEquals(manifest.w6w.network.allow, ["api.ashbyhq.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.ashby");
});

/**
 * `.search` is unpaginated and meant for lookups; `.list` walks the whole
 * organisation. The action type reflects that so the distinction survives.
 */
Deno.test("index: candidate-search is the app's only search action", () => {
  assertEquals(app.actions.filter((a) => a.type === "search").map((a) => a.key), [
    "candidate-search",
  ]);
});

/**
 * Ashby's `.delete` endpoints exist and none is implemented: deleting a
 * candidate or application destroys a hiring record, and anonymization is
 * irreversible.
 */
Deno.test("index: nothing here deletes or anonymizes a person", () => {
  for (const a of app.actions) {
    assert(!/delete|anonymize|remove/i.test(a.key), `${a.key} destroys a record`);
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
 * This app handles candidates, interview feedback and offers. A run log is not
 * the place for somebody's name, address, notes about them or their salary.
 */
Deno.test("index: no action logs personal data", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (const forbidden of [/\bemail\b/i, /\bname\b/i, /\bnote\b/i, /salary|compensation/i]) {
        assert(!forbidden.test(object), `${entry.name} logs personal data: ${object}`);
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
