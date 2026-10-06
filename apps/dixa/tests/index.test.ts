import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 28;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.map((a) => a.key), ["api-token"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(typeof a.description === "string" && a.description.length > 0, `${a.key}: description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency, and the creators are not retryable", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  for (
    const key of [
      "conversation-create-email",
      "message-add",
      "note-add",
      "end-user-create",
      "tag-create",
    ]
  ) {
    assertEquals(app.actions.find((a) => a.key === key)?.idempotent, false, key);
  }
});

Deno.test("index: every param has a key and a label", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key && p.label, `${a.key}: param without key/label`);
    }
  }
});

Deno.test("index: no action takes a credential-shaped parameter", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!/token|authorization|api[-_]?key|secret/i.test(p.key), `${a.key}/${p.key}`);
    }
  }
});

Deno.test("index: no action source sets credentials or calls the global fetch", async () => {
  for (const a of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${a.key}.ts`, import.meta.url));
    assert(!/authorization/i.test(src), `${a.key}: mentions Authorization`);
    assert(!/(^|[^.\w])fetch\(/.test(src), `${a.key}: global fetch`);
  }
});

Deno.test("index: the manifest allows only dev.dixa.io (the status host is per-check)", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["dev.dixa.io"]);
  assertEquals(pkg.w6w.id, "io.w6w.dixa");
  assertEquals(app.healthChecks[0].network?.allow, ["status.dixa.io"]);
});
