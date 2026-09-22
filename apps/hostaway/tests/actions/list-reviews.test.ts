import { assertEquals } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-reviews.ts";

Deno.test("list-reviews: GETs /v1/reviews with scalar filters", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 1 }], { count: 1 })]);
  await action.execute(
    {
      limit: 100,
      offset: 0,
      reservationId: 13,
      type: "guest-to-host",
      guestName: "Andrew",
      ratingMin: 8,
      ratingMax: 10,
      sortBy: "submittedAt",
      sortOrder: "desc",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/reviews");
  assertEquals(url.searchParams.get("reservationId"), "13");
  assertEquals(url.searchParams.get("type"), "guest-to-host");
  assertEquals(url.searchParams.get("guestName"), "Andrew");
  assertEquals(url.searchParams.get("ratingMin"), "8");
  assertEquals(url.searchParams.get("sortBy"), "submittedAt");
});

Deno.test("list-reviews: the documented array filters serialize as key[] params", async () => {
  const { ctx, calls } = mockCtx([envelope([])]);
  await action.execute({ listingMapIds: [1, 2], statuses: ["awaiting", "published"] }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("listingMapIds[]"), ["1", "2"]);
  assertEquals(url.searchParams.getAll("statuses[]"), ["awaiting", "published"]);
});

Deno.test("list-reviews: empty arrays are omitted rather than sent as nothing", async () => {
  const { ctx, calls } = mockCtx([envelope([])]);
  await action.execute({ listingMapIds: [], statuses: [] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("listingMapIds[]"), false);
  assertEquals(url.searchParams.has("statuses[]"), false);
});
