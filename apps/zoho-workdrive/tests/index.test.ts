import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };
import { API_HOSTS, REGIONS } from "../lib/regions.ts";

Deno.test("index: 24 actions, one auth method per region, two health checks", () => {
  assertEquals(app.actions.length, 24);
  assertEquals(app.auth.length, REGIONS.length);
  assertEquals(REGIONS.length, 9);
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: action keys are unique kebab-case; every action is well-formed", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert((a.description ?? "").length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: non-idempotent performs are exactly the creating/uploading ones", () => {
  const nonIdempotent = app.actions.filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key).sort();
  assertEquals(nonIdempotent, [
    "file-copy",
    "file-upload",
    "folder-create",
    "share-link-create",
    "team-folder-create",
  ]);
});

Deno.test("index: network.allow equals the regional API hosts, nothing else", () => {
  const allow = (pkg.w6w.network.allow as string[]).slice().sort();
  assertEquals(allow, API_HOSTS.slice().sort());
  assert(!allow.includes("127.0.0.1"));
  assert(!allow.some((h) => h.includes("zohostatus")));
});

Deno.test("index: every health check key is unique and a service check is present", () => {
  const keys = app.healthChecks.map((h) => h.key);
  assertEquals(keys, ["service", "quota"]);
});
