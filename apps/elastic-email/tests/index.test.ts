import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 20 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 20);
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique kebab-case with type, description, execute, output", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
    for (const p of a.params ?? []) assert(p.key && p.label, `${a.key}/${p.key}`);
  }
});

Deno.test("index: every perform action states idempotency; sends and creates are false", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const k of ["email-send", "email-send-bulk", "contact-add", "list-create"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, false, k);
  }
  for (const k of ["contact-delete", "suppression-delete", "list-remove-contacts"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, true, k);
  }
});

Deno.test("index: health checks declare the informational/service/dependency postures", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assert(quota.unavailable?.reason);
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["elasticemail.statuspage.io"]);
  const api = app.healthChecks.find((h) => h.key === "api")!;
  assertEquals(api.credential, "none");
});
