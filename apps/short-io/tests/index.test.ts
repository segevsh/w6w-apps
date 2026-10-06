import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes exactly the expected action keys, each unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(
    [...keys].sort(),
    [
      "domain-get",
      "domain-list",
      "folder-create",
      "folder-get",
      "folder-list",
      "link-archive",
      "link-bulk-create",
      "link-bulk-delete",
      "link-create",
      "link-delete",
      "link-duplicate",
      "link-expand",
      "link-get",
      "link-list",
      "link-unarchive",
      "link-update",
      "qr-code-create",
      "tag-list",
    ],
  );
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), k);
});

Deno.test("index: every action has a description, output and execute; performs state idempotency", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && a.description.length > 0, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assert(Array.isArray(a.output), a.key);
    if (a.type === "perform") assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: declares the api-key auth and the service + quota checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: the quota check is a declared absence with informational severity", () => {
  const q = app.healthChecks.find((h) => h.key === "quota")!;
  assertEquals(q.severity, "informational");
  assert(q.unavailable?.reason);
});

Deno.test("index: no action carries a credential header of its own", async () => {
  const src = await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url));
  assert(!/authorization/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), "client sets Authorization");
});
