import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 27 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 27);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
    if (a.key.endsWith("-create") || a.key.endsWith("-add")) assertEquals(a.idempotent, false);
  }
});

Deno.test("index: no action touches a credential or global fetch", async () => {
  for (const dir of ["actions"]) {
    for (const f of Deno.readDirSync(new URL(`../${dir}/`, import.meta.url))) {
      const src = await Deno.readTextFile(new URL(`../${dir}/${f.name}`, import.meta.url));
      assert(!/authorization|apikey/i.test(src), `${dir}/${f.name}: mentions a credential`);
      assert(!/[^.\w]fetch\(/.test(src), `${dir}/${f.name}: calls global fetch`);
    }
  }
});

Deno.test("index: every health check declares a severity when it is unavailable", () => {
  for (const h of app.healthChecks) {
    if (h.unavailable) assertEquals(h.severity, "informational", h.key);
  }
});
