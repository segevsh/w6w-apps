import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes 49 uniquely-keyed actions", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 49);
  assertEquals(new Set(keys).size, 49);
});

Deno.test("index: every action has title, description, resource and a valid type", () => {
  for (const a of app.actions) {
    assert(a.title && a.description && a.resource, a.key);
    assert(["read", "perform"].includes(a.type), a.key);
  }
});

Deno.test("index: every perform action states idempotency; sends are not idempotent", () => {
  for (const a of app.actions.filter((x) => x.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", a.key);
  }
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "appointment-create",
    "campaign-create",
    "campaign-message-send",
    "contact-attribute-create",
    "contact-tag-create",
    "conversation-note-create",
    "data-feed-event-send",
    "message-send",
    "review-invite-create",
    "review-response-create",
    "webhook-create",
  ]);
});

Deno.test("index: one OAuth2 auth method and the two declared health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});
