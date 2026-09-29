import { assertEquals } from "@std/assert";
import subscriptionList from "../../actions/subscription-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-list: fetches GET /publications/:id/subscriptions with the given filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "sub_1" }], limit: 10, has_more: true, next_cursor: "next_1" },
  }]);

  const out = await subscriptionList.execute({
    publicationId: "pub_1",
    status: "active",
    tier: "premium",
    premiumTiers: "Gold",
    limit: 25,
    page: 3,
    email: "a@b.com",
  }, ctx) as { has_more: boolean; next_cursor: string };

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/publications/pub_1/subscriptions");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("tier"), "premium");
  assertEquals(url.searchParams.getAll("premium_tiers[]"), ["Gold"]);
  assertEquals(url.searchParams.get("limit"), "25");
  assertEquals(url.searchParams.get("page"), "3");
  assertEquals(url.searchParams.get("email"), "a@b.com");
  assertEquals(out.has_more, true);
  assertEquals(out.next_cursor, "next_1");
});

Deno.test("subscription-list: a cursor overrides page rather than combining with it", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await subscriptionList.execute({ publicationId: "pub_1", cursor: "abc", page: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("cursor"), "abc");
  assertEquals(url.searchParams.has("page"), false);
});

Deno.test("subscription-list: is a read action", () => {
  assertEquals(subscriptionList.type, "read");
});
