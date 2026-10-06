import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 32;

Deno.test("index: exports actions, auth and health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action has a type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output) && (a.output as unknown[]).length > 0, `${a.key}: no output`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

Deno.test("index: creates are not idempotent, updates and deletes are", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (
    const k of [
      "project-create",
      "locale-create",
      "key-create",
      "translation-create",
      "job-create",
      "upload-create",
    ]
  ) {
    assertEquals(byKey.get(k)?.idempotent, false, k);
  }
  for (
    const k of ["project-update", "key-update", "key-delete", "keys-tag", "translation-verify"]
  ) {
    assertEquals(byKey.get(k)?.idempotent, true, k);
  }
});

Deno.test("index: every list action takes page and perPage (max 100)", () => {
  const lists = app.actions.filter((a) =>
    ((a.output ?? []) as Array<{ key: string }>).some((o) => o.key === "nextPage")
  );
  assert(lists.length >= 10, `only ${lists.length} list actions`);
  for (const a of lists) {
    const per = a.params?.find((p) => p.key === "perPage");
    assertEquals(per?.validation?.max, 100, a.key);
    assert(a.params?.some((p) => p.key === "page"), `${a.key}: no page param`);
  }
});

Deno.test("index: no action asks for a credential", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        p.type !== "secret" && !/token|password|authorization/i.test(p.key),
        `${a.key}.${p.key}`,
      );
    }
  }
});

Deno.test("index: auth is the access-token apiKey with a region field", () => {
  const auth = app.auth[0];
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.fields?.map((f) => f.key), ["accessToken", "region"]);
});
