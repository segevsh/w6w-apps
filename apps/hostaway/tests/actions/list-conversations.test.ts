import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-conversations.ts";

Deno.test("list-conversations: GETs /v1/conversations with the four documented parameters", async () => {
  const { ctx, calls } = mockCtx([envelope([{ reservationId: 2 }], { count: 1 })]);
  await action.execute({ limit: 50, offset: 0, reservationId: 2, includeResources: 1 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/conversations");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("reservationId"), "2");
  assertEquals(url.searchParams.get("includeResources"), "1");
  // There is no documented listingMapId filter on this endpoint, so none is sent.
  assertEquals(url.searchParams.has("listingMapId"), false);
});

Deno.test("list-conversations: no filters means a bare list request", async () => {
  const { ctx, calls } = mockCtx([envelope([])]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/conversations");
});
