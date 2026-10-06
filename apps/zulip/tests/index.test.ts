import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_COUNT = 25;

Deno.test("index: exports actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, ACTION_COUNT);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "basic");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "site", "quota"]);
});

Deno.test("index: every action key is unique, kebab-case and has a test file", async () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
    await Deno.stat(new URL(`./actions/${key}.test.ts`, import.meta.url));
  }
});

Deno.test("index: every action has a valid type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type`);
    assert(a.description && a.description.length > 0, `${a.key}: no description`);
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
  }
});

Deno.test("index: every perform action states idempotency, and only creating ones are false", () => {
  const nonIdempotent = app.actions.filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key).sort();
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
  assertEquals(nonIdempotent, ["add-reaction", "create-channel", "send-message"]);
});

Deno.test("index: no action carries credentials or an authorization param", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !/^authorization$|api_?key|password/i.test(p.key),
        `${a.key}: credential-like ${p.key}`,
      );
    }
  }
});

Deno.test("index: the package manifest allowlists only *.zulipchat.com", async () => {
  const pkg = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));
  assertEquals(pkg.w6w.network.allow, ["*.zulipchat.com"]);
});
