import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 10 actions, one auth method and one health check", () => {
  assertEquals(app.actions.length, 10);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 1);
});

Deno.test("index: action keys are unique kebab-case with description, output and execute", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: type`);
    assert(a.description && a.description.length > 0, `${a.key}: description`);
    assertEquals(typeof a.execute, "function");
    assert(Array.isArray(a.output), `${a.key}: output`);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}: param`);
  }
});

Deno.test("index: perform actions declare idempotency; importers are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const key of ["document-import-url", "document-upload-content"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: no action takes a credential-shaped parameter", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|authorization|api[-_]?key|secret/i.test(p.key), `${a.key}/${p.key}`);
    }
  }
});

Deno.test("index: manifest identity and egress", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.docparser.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.docparser");
});
