import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";
import pkg from "../package.json" with { type: "json" };

const actions = app.actions as Array<{
  key: string;
  type: string;
  idempotent?: boolean;
  params?: Array<{ key: string; required?: boolean; secret?: boolean; type?: string }>;
  execute: unknown;
}>;

Deno.test("index: exports actions, both auth methods and three health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["oauth2", "api-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "api", "quota"]);
  assert(actions.length > 100);
});

Deno.test("index: action keys are unique kebab-case", () => {
  const keys = actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z]+(-[a-z]+)*$/.test(key), key);
});

Deno.test("index: every action has an execute hook and a valid type", () => {
  for (const a of actions) {
    assertEquals(typeof a.execute, "function", a.key);
    assert(["read", "search", "perform"].includes(a.type), a.key);
  }
});

Deno.test("index: every perform action declares idempotent honestly as a boolean", () => {
  for (const a of actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
});

Deno.test("index: creating actions are not idempotent, set-state actions are", () => {
  const byKey = new Map(actions.map((a) => [a.key, a]));
  for (const key of ["thread-create", "comment-create", "message-create", "channel-create"]) {
    assertEquals(byKey.get(key)!.idempotent, false, key);
  }
  for (const key of ["thread-pin", "channel-archive", "conversation-mark-read"]) {
    assertEquals(byKey.get(key)!.idempotent, true, key);
  }
});

Deno.test("index: no action asks for a credential", () => {
  for (const a of actions) {
    for (const p of a.params ?? []) {
      assert(p.type !== "secret" && !p.secret, `${a.key}.${p.key}`);
      assert(!/token|password/i.test(p.key), `${a.key}.${p.key}`);
    }
  }
});

Deno.test("index: the deprecated and credential-bearing endpoints are not offered", () => {
  const keys = new Set(actions.map((a) => a.key));
  for (const banned of ["user-login", "user-delete", "user-invalidate-token", "workspace-remove"]) {
    assert(!keys.has(banned), banned);
  }
});

Deno.test("package.json: identity, a single egress host and the real icon", () => {
  assertEquals(pkg.w6w.id, "io.w6w.twist");
  assertEquals(pkg.w6w.network.allow, ["api.twist.com"]);
  assertEquals(pkg.w6w.appearance.icon.svg, "./assets/icon.svg");
  assert(pkg.w6w.categories.length >= 1 && pkg.w6w.categories.length <= 3);
});
