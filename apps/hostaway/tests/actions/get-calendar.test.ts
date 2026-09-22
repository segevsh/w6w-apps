import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-calendar.ts";

Deno.test("get-calendar: GETs the calendar for the requested range", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 1, date: "2018-09-01", isAvailable: 1 }])]);
  const days = await action.execute(
    { listingId: 40160, startDate: "2018-09-01", endDate: "2018-09-30" },
    ctx,
  ) as unknown[];

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/listings/40160/calendar");
  assertEquals(url.searchParams.get("startDate"), "2018-09-01");
  assertEquals(url.searchParams.get("endDate"), "2018-09-30");
  assertEquals(url.searchParams.has("includeResources"), false);
  assertEquals(days.length, 1);
});

Deno.test("get-calendar: includeResources is forwarded as 1 (it is what fills `reservations`)", async () => {
  const { ctx, calls } = mockCtx([envelope([])]);
  await action.execute({ listingId: 1, includeResources: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeResources"), "1");
});

Deno.test("get-calendar: refuses a call without a listing id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "listingId");
});
