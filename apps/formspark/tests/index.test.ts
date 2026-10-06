import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const ACTION_COUNT = 16;

Deno.test("index: exports actions, one bearer auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-token");
  assertEquals(app.auth[0].type, "bearer");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every action declares a valid type, description, output and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
  }
});

Deno.test("index: perform actions state idempotency honestly", () => {
  const performs = app.actions.filter((a) => a.type === "perform");
  assertEquals(
    performs.map((a) => a.key).sort(),
    [
      "form-create",
      "form-delete",
      "form-update",
      "submission-delete",
      "template-delete",
      "template-set",
      "workspace-create",
      "workspace-update",
    ],
  );
  const idempotent = performs.filter((a) => a.idempotent === true).map((a) => a.key).sort();
  assertEquals(idempotent, ["form-update", "template-set", "workspace-update"]);
  for (const a of performs) assertEquals(typeof a.idempotent, "boolean", a.key);
});

Deno.test("index: the manifest allows exactly the API host", () => {
  assertEquals(pkg.w6w.id, "io.w6w.formspark");
  assertEquals(pkg.w6w.network.allow, ["api.formspark.io"]);
});

Deno.test("index: actions carry no credential param (credentials live only in sign)", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.type !== "secret" && !/key|token|secret/i.test(p.key), `${a.key}.${p.key}`);
    }
  }
});
