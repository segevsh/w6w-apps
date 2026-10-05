import { assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: declares 27 actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, 27);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: action keys are unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assertEquals(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(k), true, k);
});

Deno.test("index: the write actions declare idempotent explicitly", () => {
  const writes = [
    "vendor-create",
    "vendor-update",
    "risk-create",
    "evidence-create",
    "evidence-file-upload",
  ];
  for (const k of writes) {
    const def = app.actions.find((a) => a.key === k);
    assertEquals(typeof def?.idempotent, "boolean", k);
  }
});
