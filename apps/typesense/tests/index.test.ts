import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 16 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 16);
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
 * Creating a collection or a key makes something new, and dropping a
 * collection cannot be repeated. Everything else converges.
 */
Deno.test("index: three actions are non-idempotent, and they are the right three", () => {
  const keys = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(keys, ["collection-create", "collection-delete", "key-create"]);
});

Deno.test("index: exports the auth method and all three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "node", "capacity"]);
});

/** Every Typesense deployment is its own host. */
Deno.test("index: the manifest admits a node can be anywhere", () => {
  assertEquals(manifest.w6w.network.allow, ["*"]);
  assertEquals(manifest.w6w.id, "io.w6w.typesense");
  assertEquals(manifest.w6w.categories, ["search", "databases"]);
});

/**
 * The load-bearing behaviour: an import answers 200 with per-document results,
 * so the action must read every line rather than trusting the status.
 */
Deno.test("index: the import action reads the per-document result", async () => {
  const src = await Deno.readTextFile(new URL("../actions/document-import.ts", import.meta.url));
  assert(/parseImportResult\(/.test(src), "document-import does not parse the JSONL result");
  assert(/allowPartial/.test(src), "document-import has no gate on a partial write");
  const action = app.actions.find((a) => a.key === "document-import")!;
  const allowPartial = (action.params as Array<{ key: string; default?: unknown }>).find((p) =>
    p.key === "allowPartial"
  )!;
  assertEquals(allowPartial.default, false, "a partial write must fail by default");
});

/** Below ten hits Typesense drops query words, and nothing says so. */
Deno.test("index: search offers a strict mode that turns off both widenings", async () => {
  const src = await Deno.readTextFile(new URL("../actions/document-search.ts", import.meta.url));
  assert(/drop_tokens_threshold/.test(src), "search does not control token dropping");
  assert(/typo_tokens_threshold/.test(src), "search does not control typo widening");
});

/** Two actions can empty something, and both check first. */
Deno.test("index: the destructive actions gate themselves", () => {
  const drop = app.actions.find((a) => a.key === "collection-delete")!;
  const confirm = (drop.params as Array<{ key: string; required?: boolean }>).find((p) =>
    p.key === "confirm"
  );
  assertEquals(confirm?.required, true);

  const remove = app.actions.find((a) => a.key === "document-delete")!;
  assert(
    (remove.params as Array<{ key: string }>).some((p) => p.key === "maxDocuments"),
    "document-delete has no ceiling on a filtered delete",
  );
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
    assert(!/x-typesense-api-key/i.test(src), `${entry.name} sets the key header`);
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${entry.name} reads the credential`,
    );
  }
});

/**
 * Documents are the customer's data and `key-create` returns a secret that
 * exists nowhere else. A run log records counts and names.
 */
Deno.test("index: no action logs a document, a key value or a query", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
    for (const call of logs) {
      const object = call.slice(call.indexOf("{"));
      for (
        const forbidden of [
          /:\s*(?:value|documents|document|hits|q|created|keys|body)\s*[,}]/i,
          /[{,]\s*(?:value|documents|document|hits|q|created|body)\s*[,}]/i,
        ]
      ) {
        assert(!forbidden.test(object), `${entry.name} logs data: ${object}`);
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
