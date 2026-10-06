import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports 29 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 29);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a type, description, output, resource and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key}: no output`);
    assert(a.resource, `${a.key}: no resource`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every perform action states idempotency; creates are not idempotent", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  for (const a of performs) assertEquals(typeof a.idempotent, "boolean", `${a.key}`);
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (
    const k of [
      "link-create",
      "link-bulk-create",
      "domain-create",
      "folder-create",
      "tag-create",
      "track-lead",
      "track-sale",
    ]
  ) assertEquals(byKey.get(k)?.idempotent, false, k);
  for (const k of ["link-upsert", "link-update", "link-delete", "customer-delete"]) {
    assertEquals(byKey.get(k)?.idempotent, true, k);
  }
});

Deno.test("index: every required param has a label and every action param key is unique", () => {
  for (const a of app.actions) {
    const keys = a.params!.map((p) => p.key);
    assertEquals(new Set(keys).size, keys.length, `${a.key}: duplicate param key`);
    for (const p of a.params!) assert(p.label, `${a.key}.${p.key}: no label`);
  }
});

Deno.test("index: no action exposes a body or query field the reference marks deprecated", () => {
  // `tagId` is absent from this list on purpose: it is deprecated on the link
  // endpoints (use `tagIds`) but is the current filter on analytics and events,
  // and the path-ID param of tag-update. Link actions are checked for it below.
  const deprecated = ["withTags", "publicStats", "webhookIds", "order", "qr", "tag", "page"];
  for (const a of app.actions) {
    for (const p of a.params!) {
      if (p.key === "page" && ["folder-list", "tag-list", "event-list"].includes(a.key)) continue;
      assert(!deprecated.includes(p.key), `${a.key} exposes deprecated ${p.key}`);
    }
    if (a.key.startsWith("link-")) {
      assert(!a.params!.some((p) => p.key === "tagId"), `${a.key} exposes deprecated tagId`);
    }
  }
});
