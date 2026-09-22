import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-reservations.ts";

Deno.test("list-reservations: GETs /v1/reservations with the documented filters", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 13 }], { count: 1, page: 1, totalPages: 1 })]);
  await action.execute(
    { limit: 100, offset: 0, listingId: 40160, dateType: "arrival", startDate: "2026-01-01" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/reservations");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("listingId"), "40160");
  assertEquals(url.searchParams.get("dateType"), "arrival");
  assertEquals(url.searchParams.get("startDate"), "2026-01-01");
  assertEquals(url.searchParams.has("endDate"), false);
  assertEquals(url.searchParams.has("match"), false);
});

Deno.test("list-reservations: the boolean filters use Hostaway's documented 0/1 posture", async () => {
  const { ctx, calls } = mockCtx([envelope([])]);
  await action.execute({ hasUnreadConversationMessages: true, includeResources: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("hasUnreadConversationMessages"), "1");
  assertEquals(url.searchParams.get("includeResources"), "1");
});
