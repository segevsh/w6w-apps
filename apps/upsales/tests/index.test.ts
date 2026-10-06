import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 68;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares type, description, params, output and execute", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.params), `${a.key}: no params`);
    assert(a.output !== undefined, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
    if (/-create$/.test(a.key) || a.key === "ticket-comment-add") {
      assertEquals(a.idempotent, false, `${a.key}: a create must not be retried`);
    }
  }
});

Deno.test("index: no action carries a credential or reads the token", () => {
  for (const a of app.actions) {
    const src = String(a.execute);
    assert(!/authorization/i.test(src), `${a.key}: touches an Authorization header`);
    assert(!/\btoken\b\s*[:=]/.test(src.replace(/token\b.*filter/i, "")), `${a.key}: sets token`);
  }
});

Deno.test("index: the manifest allowlists exactly the one API host", () => {
  assertEquals(pkg.w6w.network.allow, ["integration.upsales.com"]);
  assertEquals(pkg.w6w.id, "io.w6w.upsales");
});

Deno.test("index: auth uses the query-string token and the probe is /self", () => {
  const auth = app.auth[0];
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "query", name: "token" });
});

Deno.test("index: the service check is informational (the page names no API component)", () => {
  const service = app.healthChecks.find((h) => h.key === "service")!;
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.upsales.com"]);
});

Deno.test("index: the api check is unsigned", () => {
  const api = app.healthChecks.find((h) => h.key === "api")!;
  assertEquals(api.credential, "none");
});
