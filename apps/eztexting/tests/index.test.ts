import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

/** The 31 operations chosen for this build, pinned by key so a dropped action fails loudly. */
const EXPECTED_KEYS = [
  "contact-batch-upsert",
  "contact-delete",
  "contact-get",
  "contact-list",
  "contact-upsert",
  "conversation-list",
  "conversation-message-list",
  "credit-balance-get",
  "group-add-contacts",
  "group-create",
  "group-delete",
  "group-get",
  "group-list",
  "group-remove-contacts",
  "group-update",
  "keyword-check",
  "keyword-get",
  "keyword-list",
  "media-create",
  "media-delete",
  "media-get",
  "media-list",
  "message-delete",
  "message-details-get",
  "message-list",
  "message-report-get",
  "message-send",
  "outbound-block",
  "webhook-create",
  "webhook-delete",
  "webhook-list",
];

Deno.test("index: exposes exactly the pinned actions", () => {
  assertEquals([...app.actions.map((a) => a.key)].sort(), [...EXPECTED_KEYS].sort());
});

Deno.test("index: action keys are unique kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(key), key);
});

Deno.test("index: every perform action states its idempotency", () => {
  for (const action of app.actions) {
    if (action.type === "perform") {
      assertEquals(typeof action.idempotent, "boolean", action.key);
    }
  }
});

Deno.test("index: sends and creates are non-idempotent; the API has no idempotency key", () => {
  const nonIdempotent = app.actions.filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key).sort();
  assertEquals(nonIdempotent, ["group-create", "media-create", "message-send", "webhook-create"]);
});

Deno.test("index: one basic-auth method and two health checks", () => {
  assertEquals(app.auth?.map((a) => a.key), ["basic"]);
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "quota"]);
});
