import { assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-get: fetches GET /publications/:id/subscriptions/:id with expand", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "sub_1", email: "a@b.com", status: "active" } },
  }]);

  const out = await subscriptionGet.execute({
    publicationId: "pub_1",
    subscriptionId: "sub_1",
    expand: "stats,tags",
  }, ctx) as { id: string };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/publications/pub_1/subscriptions/sub_1");
  assertEquals(url.searchParams.getAll("expand[]"), ["stats", "tags"]);
  assertEquals(out.id, "sub_1");
});

Deno.test("subscription-get: omits expand entirely when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await subscriptionGet.execute({ publicationId: "pub_1", subscriptionId: "sub_1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("subscription-get: is a read action", () => {
  assertEquals(subscriptionGet.type, "read");
});
