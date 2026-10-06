import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 8 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 8);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 3);
});

Deno.test("index: action keys are unique kebab-case with type, description and execute", () => {
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

Deno.test("index: perform actions declare idempotency and none is marked idempotent", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(a.idempotent, false, a.key);
  }
});

Deno.test("index: health checks are keyed and every declared absence is informational", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["api", "service", "quota"]);
  for (const h of app.healthChecks.filter((h) => h.unavailable)) {
    assertEquals(h.severity, "informational", h.key);
    assertEquals(h.check, undefined, h.key);
  }
});

Deno.test("index: the manifest allow-lists only the documented API host", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["api.perspective.co"]);
});
