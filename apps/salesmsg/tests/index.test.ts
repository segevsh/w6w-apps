import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

/** The 27 operations chosen for this build, pinned by key so scope creep and a dropped action fail. */
const EXPECTED_KEYS = [
  "user-get",
  "organization-get",
  "member-list",
  "team-list",
  "team-get",
  "number-list",
  "contact-list",
  "contact-search",
  "contact-get",
  "contact-create",
  "contact-update",
  "contact-delete",
  "contact-opt-out",
  "contact-opt-in",
  "tag-list",
  "tag-create",
  "contact-tag-add",
  "contact-tag-remove",
  "conversation-list",
  "conversation-get",
  "conversation-start",
  "conversation-close",
  "conversation-open",
  "conversation-assign",
  "message-send",
  "message-send-to-conversation",
  "message-list",
];

Deno.test("index: exports the 27 chosen actions, one auth method and two health checks", () => {
  assertEquals(app.actions.length, EXPECTED_KEYS.length);
  assertEquals(app.actions.map((a) => a.key).sort(), EXPECTED_KEYS.slice().sort());
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "access-token");
  assertEquals(app.healthChecks.length, 2);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assert(typeof action.idempotent === "boolean", `${action.key} has no idempotent flag`);
    }
  }
});

Deno.test("index: every send and create is non-idempotent", () => {
  const nonIdempotent = app.actions.filter((a) => a.type === "perform" && a.idempotent === false)
    .map((a) => a.key).sort();
  assertEquals(nonIdempotent, [
    "contact-create",
    "conversation-start",
    "message-send",
    "message-send-to-conversation",
    "tag-create",
  ]);
});

Deno.test("index: no action mentions a credential header", async () => {
  for (const action of app.actions) {
    const src = await Deno.readTextFile(new URL(`../actions/${action.key}.ts`, import.meta.url));
    assert(!/authorization|bearer/i.test(src.replace(/\/\*\*[\s\S]*?\*\//g, "")), action.key);
  }
});
