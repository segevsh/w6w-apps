import { assertEquals, assertRejects } from "@std/assert";
import customerCreate from "../../actions/customer-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-create: sends POST /customers", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 1, "email": "a@b.co" } }]);
  const out = await customerCreate.execute(
    {
      "email": "a@b.co",
      "name": "Ann",
      "tags": "vip, annual-member",
      "unsubscribedTopicIds": "12,15",
      "skipInvite": true,
      "optedInForNewsAndUpdates": false,
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "email": "a@b.co",
    "name": "Ann",
    "skip_invite": true,
    "opted_in_for_news_and_updates": false,
    "tags": ["vip", "annual-member"],
    "unsubscribed_topic_ids": [12, 15],
  });
  assertEquals(out, { "id": 1, "email": "a@b.co" });
});

Deno.test("customer-create: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      customerCreate.execute(
        {
          "email": "a@b.co",
          "name": "Ann",
          "tags": "vip, annual-member",
          "unsubscribedTopicIds": "12,15",
          "skipInvite": true,
          "optedInForNewsAndUpdates": false,
        } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});
