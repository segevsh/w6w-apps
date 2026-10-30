import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import campaignSend from "../../actions/campaign-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("campaign-send: POSTs to /campaigns/{id}/send with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, scheduled_at: "2026-09-22T12:00:00.000Z" } }]);
  const out = await campaignSend.execute({ id: 7 }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/campaigns/7/send");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, 7);
});

/**
 * Sending email is the one action here that must never be retried: a second
 * attempt runs against a campaign whose state has already changed.
 */
test("campaign-send: is explicitly not idempotent", () => {
  assertEquals(campaignSend.idempotent, false);
});
