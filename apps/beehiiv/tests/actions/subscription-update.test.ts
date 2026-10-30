import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import subscriptionUpdate from "../../actions/subscription-update.ts";
import { mockCtx } from "../_helpers.ts";

test("subscription-update: PATCHes only the given fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "sub_1", email: "a@b.com", status: "active" } },
  }]);

  const out = await subscriptionUpdate.execute({
    publicationId: "pub_1",
    subscriptionId: "sub_1",
    tier: "premium",
    newsletterListIds: "list_1,list_2",
  }, ctx) as { id: string };

  assertEquals(
    calls[0].url,
    "https://api.beehiiv.com/v2/publications/pub_1/subscriptions/sub_1",
  );
  assertEquals(calls[0].method, "PATCH");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { tier: "premium", newsletter_list_ids: ["list_1", "list_2"] });
  assertEquals(out.id, "sub_1");
});

test("subscription-update: unsubscribe is sent as a plain boolean, including false", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "sub_1" } } }]);
  await subscriptionUpdate.execute(
    { publicationId: "pub_1", subscriptionId: "sub_1", unsubscribe: false },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.unsubscribe, false);
});

test("subscription-update: is an idempotent perform action", () => {
  assert(!!subscriptionUpdate.idempotent);
  assertEquals(subscriptionUpdate.type, "perform");
});
