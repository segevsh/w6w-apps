import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

Deno.test("index: 17 actions, one auth method, two health checks", () => {
  assertEquals(app.actions.length, 17);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case; each has type, description, execute, output", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
  }
});

Deno.test("index: every perform action states idempotency; creates and deletes are not idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  for (const k of ["webhook-create", "webhook-delete", "legal-hold-create", "custodian-remove"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, false, k);
  }
  for (const k of ["legal-hold-release", "custodian-add"]) {
    assertEquals(app.actions.find((a) => a.key === k)?.idempotent, true, k);
  }
});

Deno.test("index: manifest allows only the API host; the status host is per-hook", () => {
  assertEquals(pkg.w6w.network.allow, ["public-api.granola.ai"]);
  assertEquals(app.healthChecks.find((h) => h.key === "service")?.network?.allow, [
    "status.granola.ai",
  ]);
});

Deno.test("index: no action holds a credential", async () => {
  for (const f of Deno.readDirSync(new URL("../actions", import.meta.url))) {
    const src = await Deno.readTextFile(new URL(`../actions/${f.name}`, import.meta.url));
    assert(!/authorization/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), f.name);
  }
});
