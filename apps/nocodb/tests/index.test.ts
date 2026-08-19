import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 13 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 13);
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

/** Only creating makes new rows each time. */
Deno.test("index: only creating records is non-idempotent", () => {
  assertEquals(app.actions.filter((a) => a.idempotent === false).map((a) => a.key), [
    "record-create",
  ]);
});

Deno.test("index: exports the auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "instance", "quota"]);
});

/** Every NocoDB deployment is its own host. */
Deno.test("index: the manifest admits an instance can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.nocodb");
  assertEquals(manifest.w6w.categories, ["spreadsheets", "databases"]);
});

/**
 * A `where` with spaces returns 200 and no rows, so both actions that take one
 * must check before sending rather than trusting the response.
 */
Deno.test("index: every action taking a filter validates it first", async () => {
  for (const name of ["record-list", "record-count"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/assertWhere\(/.test(src), `${name} does not validate its filter`);
  }
});

/**
 * Sixty requests a minute means the bulk endpoints are not an optimisation,
 * they are the only way an import finishes.
 */
Deno.test("index: the write actions send one request for many records", async () => {
  for (const name of ["record-create", "record-update"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(
      /records\.length === 1 \? records\[0\] : records/.test(src),
      `${name} does not send an array in one request`,
    );
  }
});

/** Deletion is final, and NocoDB's API has no undo. */
Deno.test("index: deleting requires a confirmation", () => {
  const remove = app.actions.find((a) => a.key === "record-delete")!;
  const confirm = (remove.params as Array<{ key: string; required?: boolean }>).find((p) =>
    p.key === "confirm"
  );
  assertEquals(confirm?.required, true);
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
    assert(!/xc-token|xc-auth/i.test(src), `${entry.name} sets a NocoDB credential header`);
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${entry.name} reads the credential`,
    );
  }
});

/** Rows are the customer's data, and some tables hold personal information. */
Deno.test("index: no action logs a record's values", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /:\s*(?:records|record|list|rows|created|updated|values|where)\s*[,}]/i,
          /[{,]\s*(?:records|record|list|rows|created|updated|values|where)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs record data: ${object}`);
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
