import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exports the full action set with unique kebab-case keys", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys, [
    "list-spaces",
    "get-space",
    "create-space",
    "setup-space",
    "update-space",
    "find-direct-message",
    "create-message",
    "get-message",
    "list-messages",
    "search-messages",
    "update-message",
    "delete-message",
    "list-members",
    "create-member",
    "delete-member",
    "create-reaction",
    "list-reactions",
    "delete-reaction",
  ]);
  assertEquals(new Set(keys).size, keys.length);
  for (const k of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k), `${k} is not kebab-case`);
});

Deno.test("index: every action declares a valid type, description, params and output", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title, `${a.key} has no title`);
    assert(a.description, `${a.key} has no description`);
    assert(Array.isArray(a.params) && a.params.length > 0, `${a.key} has no params`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} has no output`);
    assertEquals(typeof a.execute, "function", `${a.key} has no execute hook`);
  }
});

Deno.test("index: every perform action declares idempotent honestly", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
  // Every write here either carries a server-side `requestId` (create-space,
  // setup-space, create-message), converges on the same state (update-*), or
  // reports ALREADY_EXISTS / 404 on a repeat (add/remove member, add/remove
  // reaction, delete-message) — so all of them are honestly retryable.
  assertEquals(
    app.actions.filter((a) => a.type === "perform" && a.idempotent === false).map((a) => a.key),
    [],
  );
});

Deno.test("index: every action names the resource it operates on", () => {
  const byResource = new Map<string, string[]>();
  for (const a of app.actions) {
    assert(a.resource, `${a.key} declares no resource`);
    byResource.set(a.resource!, [...(byResource.get(a.resource!) ?? []), a.key]);
  }
  assertEquals([...byResource.keys()].sort(), ["membership", "message", "reaction", "space"]);
});

Deno.test("index: declares exactly one auth method — user OAuth2", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "oauth2");
  assertEquals(app.auth?.[0].type, "oauth2");
});

Deno.test("index: declares the service and quota health checks", () => {
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the only search-typed action is the one Google implements as a search", () => {
  assertEquals(app.actions.filter((a) => a.type === "search").map((a) => a.key), [
    "search-messages",
  ]);
});

Deno.test("index: every param has a key, label and type", () => {
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(p.key, `${a.key} has a param with no key`);
      assert(p.label, `${a.key}.${p.key} has no label`);
      assert(p.type, `${a.key}.${p.key} has no type`);
    }
  }
});

Deno.test("index: no action declares a credential-shaped param", () => {
  // Credentials only ever reach the `sign` hook. An action asking for a token
  // would be a contract violation, not a feature. `pageToken` is an opaque
  // pagination cursor, not a credential, so the pattern is deliberately narrow.
  const CREDENTIAL_SHAPED =
    /(access|api|auth|bearer|refresh|client)[-_]?(token|key|secret)|secret|password|credential/i;
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(!CREDENTIAL_SHAPED.test(p.key), `${a.key}.${p.key} looks like a credential`);
      assert(p.type !== "secret", `${a.key}.${p.key} collects a secret in an action`);
    }
  }
});
