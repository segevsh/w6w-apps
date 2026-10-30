import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import { mockCtx, optionValues } from "../_helpers.ts";

import createWebhook from "../../actions/create-webhook.ts";

const EVENTS = [
  "subscriber.created",
  "subscriber.added_to_segment",
  "subscriber.unsubscribed",
];

test("create-webhook: POSTs name, post_url and events", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh1" } }]);
  await createWebhook.execute(
    { name: "Sync", postUrl: "https://example.com/hooks/x", events: ["subscriber.created"] },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/webhooks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Sync",
    post_url: "https://example.com/hooks/x",
    events: ["subscriber.created"],
  });
});

test("create-webhook: offers exactly Flodesk's three published events", () => {
  const events = createWebhook.params!.find((p) => p.key === "events")!;
  assertEquals(events.type, "multiselect");
  assertEquals(events.required, true);
  assertEquals(optionValues(events), EVENTS);
});

test("create-webhook: rejects an empty event list without calling", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => createWebhook.execute({ name: "x", postUrl: "https://e.com", events: [] }, ctx),
    Error,
  );
  assertEquals(calls.length, 0);
});

test("create-webhook: is NOT idempotent — a replay double-delivers every event", () => {
  assertEquals(createWebhook.idempotent, false);
});

test("create-webhook: warns that Flodesk publishes no signature to verify", () => {
  const postUrl = createWebhook.params!.find((p) => p.key === "postUrl")!;
  assert(/no signature/i.test(postUrl.hint!), "the missing signature must be surfaced");
});
