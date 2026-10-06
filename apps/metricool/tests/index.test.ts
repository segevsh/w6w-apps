import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 18;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every action has a type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}`);
  }
});

Deno.test("index: brand-scoped actions require blogId, account-level ones do not take it", () => {
  const accountLevel = new Set(["brand-list", "brand-get"]);
  for (const a of app.actions) {
    const blog = (a.params ?? []).find((p) => p.key === "blogId");
    if (accountLevel.has(a.key)) assertEquals(blog, undefined, a.key);
    else assertEquals(blog?.required, true, a.key);
  }
});

Deno.test("index: every perform declares idempotency; creates are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const key of ["post-create", "competitor-add"]) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: no param is named like a credential", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|password|secret/i.test(p.key), `${a.key}/${p.key}`);
    }
  }
});

Deno.test("index: the egress allowlist is the one API host", () => {
  assertEquals(pkg.w6w.network.allow, ["app.metricool.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.metricool");
});

Deno.test("index: the sign hook is the only place the credential is read", () => {
  assertEquals(typeof app.auth[0].sign, "function");
  assertEquals(app.auth[0].key, "user-token");
});
