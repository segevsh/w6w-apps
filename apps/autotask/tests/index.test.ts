import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import { ZONES } from "../lib/client.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; network: { allow: string[] }; categories: string[] } };

Deno.test("index: exports 21 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 21);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
    assertEquals(typeof a.execute, "function");
  }
});

Deno.test("index: every perform action declares idempotent, and every create is not", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key);
  assertEquals(notIdempotent, [
    "ticket-create",
    "ticket-note-create",
    "company-create",
    "contact-create",
    "time-entry-create",
    "project-create",
    "project-task-create",
    "opportunity-create",
  ]);
});

Deno.test("index: one auth method and three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-user"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api", "quota"]);
});

/** The zone list and the manifest's allowlist are two copies of one fact; they must agree. */
Deno.test("manifest: network.allow is exactly the discovery host plus every zone host", () => {
  const expected = [
    "webservices.autotask.net",
    ...ZONES.map((z) => `webservices${z}.autotask.net`),
  ];
  assertEquals([...manifest.w6w.network.allow].sort(), [...expected].sort());
});

Deno.test("manifest: id and 1-3 categories", () => {
  assertEquals(manifest.w6w.id, "io.w6w.autotask");
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
});
