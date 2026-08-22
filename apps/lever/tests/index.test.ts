import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 12 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 12);
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

/** Creating a candidate and writing a note each add a record. */
Deno.test("index: only creating an opportunity and adding a note are non-idempotent", () => {
  const keys = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(keys, ["note-add", "opportunity-create"]);
});

Deno.test("index: exports the auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the manifest names Lever's hosts", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api.lever.co",
    "api.eu.lever.co",
    "api.sandbox.lever.co",
    "status.lever.co",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.lever");
  assertEquals(manifest.w6w.categories, ["hr", "productivity"]);
});

/**
 * Lever's `confidentiality` defaults to non-confidential, so a listing that
 * does not set it returns a subset with no indication. Both listing actions
 * must choose deliberately.
 */
Deno.test("index: every listing action sets confidentiality explicitly", async () => {
  for (const name of ["opportunity-list", "posting-list"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/confidentiality/.test(src), `${name} does not set confidentiality`);
    const action = app.actions.find((a) => a.key === name)!;
    const param = (action.params as Array<{ key: string; default?: unknown }>).find((p) =>
      p.key === "confidentiality"
    );
    assertEquals(param?.default, "all", `${name} does not default to all`);
  }
});

/** Lever attributes every write to a user, and refuses a create without one. */
Deno.test("index: every write action requires a performAs", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    const param = (action.params as Array<{ key: string; required?: boolean }>).find((p) =>
      p.key === "performAs"
    );
    assertEquals(param?.required, true, `${action.key} does not require performAs`);
  }
});

/**
 * The sandbox is a separate account with separate data, so nothing may reach
 * it by accident — the host comes from the connection alone.
 */
Deno.test("index: no action chooses its own host", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    assert(!/api\.lever\.co|SANDBOX_API/.test(src), `${entry.name} hardcodes a host`);
  }
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

const sources = async function* () {
  for (const dir of ["actions", "health", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      yield {
        name: `${dir}/${entry.name}`,
        src: code(await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url))),
      };
    }
  }
};

Deno.test("index: nothing reaches the network except through ctx.fetch", async () => {
  for await (const { name, src } of sources()) {
    assert(!/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")), `${name} calls global fetch`);
    assert(!/\bDeno\./.test(src), `${name} touches Deno.*`);
    assert(!/\bfrom\s+"node:/.test(src), `${name} imports from node:`);
    assert(!/\bimport\s*\(/.test(src), `${name} uses a dynamic import`);
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/\bbtoa\(/.test(src), `${entry.name} encodes basic auth`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${entry.name} reads the credential`,
    );
  }
});

/**
 * This app handles candidates: names, emails, notes about people, and offer
 * compensation. A run log records counts and ids.
 */
Deno.test("index: no action logs a candidate, a note or an offer", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /:\s*(?:name|value|emails|email|notes|note|offers|opportunities|users|contact)\s*[,}]/i,
          /[{,]\s*(?:name|value|emails|email|notes|note|offers|opportunities|users|contact)\s*[,}]/i,
        ]
      ) {
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
