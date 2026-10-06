import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const KEYS = [
  "chart-render",
  "chart-url-create",
  "chart-validate",
  "chart-draft-from-text",
  "qr-render",
  "qr-url-build",
  "qr-validate",
  "qr-read",
  "barcode-render",
  "wordcloud-render",
  "table-render",
  "graphviz-render",
  "watermark-apply",
];

Deno.test("index: exports every action once, with unique kebab-case keys", () => {
  assertEquals(app.actions.map((a) => a.key), KEYS);
  for (const a of app.actions) assert(/^[a-z][a-z0-9-]*$/.test(a.key), a.key);
});

Deno.test("index: every action runs without a connection and declares an execute and output", () => {
  for (const a of app.actions) {
    assertEquals(a.requiresAuth, false, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output) && a.output.length > 0, a.key);
  }
});

Deno.test("index: one optional api-key auth and the service + quota health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: perform actions state their idempotency", () => {
  for (const a of app.actions) {
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});
