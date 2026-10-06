import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 39);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), `not kebab-case: ${k}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  for (const a of performs) assertEquals(typeof a.idempotent, "boolean", a.key);
  for (const a of performs) {
    if (a.key.startsWith("create-") || a.key.startsWith("add-")) {
      assertEquals(a.idempotent, false, `${a.key}: a retry would duplicate`);
    }
    if (a.key.startsWith("delete-") || a.key.startsWith("update-")) {
      assertEquals(a.idempotent, true, `${a.key}`);
    }
  }
});

Deno.test("index: every list action carries the shared paging params", () => {
  const lists = app.actions.filter((a) => a.key.startsWith("list-"));
  assertEquals(lists.length, 13);
  for (const a of lists) {
    const keys = (a.params ?? []).map((p) => p.key);
    for (const k of ["limit", "offset", "fields", "orderBy", "filters"]) {
      assert(keys.includes(k), `${a.key}: missing ${k}`);
    }
  }
});

Deno.test("index: every param has a key and a label, and keys are unique per action", () => {
  for (const a of app.actions) {
    const keys = (a.params ?? []).map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param`);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: param without key/label`);
  }
});

/** Strip comments so the guards scan CODE, not the prose explaining it. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
const actionSource = async (key: string) =>
  code(await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)));

Deno.test("index: no action touches a credential, global fetch, Deno.* or a literal host", async () => {
  for (const a of app.actions) {
    const src = await actionSource(a.key);
    assert(!/credential/i.test(src), `${a.key}: references a credential`);
    assert(!/["'`]?authorization["'`]?\s*[\]:=]/i.test(src), `${a.key}: sets the auth header`);
    assert(!/(^|[^.\w])fetch\s*\(/.test(src), `${a.key}: calls a bare fetch`);
    assert(!/\bDeno\./.test(src), `${a.key}: touches Deno.*`);
    assert(!/outseta\.com/i.test(src), `${a.key}: hard-codes a host — it is per-connection`);
  }
});

Deno.test("index: the comment stripper strips, and a URL's // survives", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assert(code('const u = "https://x/y";').includes("https://x/y"));
  assert(/credential/.test(code("const c = credential;")));
});

Deno.test("index: the manifest allows only the per-account vendor domain", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["*.outseta.com"]);
});
