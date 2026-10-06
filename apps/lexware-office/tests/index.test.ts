import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

Deno.test("index: exports 22 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 22);
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["api", "service", "quota"]);
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

Deno.test("index: every perform action is non-idempotent (Lexware documents no idempotency key)", () => {
  const performs = app.actions.filter((a) => a.type === "perform").map((a) => a.key).sort();
  assertEquals(performs, [
    "article-create",
    "contact-create",
    "contact-update",
    "credit-note-create",
    "invoice-create",
    "order-confirmation-create",
    "quotation-create",
  ]);
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(a.idempotent, false, a.key);
  }
});

Deno.test("index: manifest allows exactly api.lexware.io", () => {
  assertEquals(pkg.w6w.network.allow, ["api.lexware.io"]);
  assertEquals(pkg.w6w.id, "io.w6w.lexware-office");
});

Deno.test("index: service and quota are declared absences, api is a live unsigned probe", () => {
  const by = Object.fromEntries(app.healthChecks.map((h) => [h.key, h]));
  assertEquals(by.service.severity, "informational");
  assertEquals(by.quota.severity, "informational");
  assertEquals(by.api.credential, "none");
});
