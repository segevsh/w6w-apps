import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/update-calendar.ts";

Deno.test("update-calendar: PUTs the documented interval object to /v1/listings/{id}/calendar", async () => {
  const { ctx, calls } = mockCtx([envelope([{ id: 1, date: "2017-09-01" }])]);
  await action.execute(
    {
      listingId: 40160,
      startDate: "2017-09-01",
      endDate: "2017-09-05",
      isAvailable: false,
      price: 20,
      minimumStay: 1,
      note: "test",
    },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.hostaway.com/v1/listings/40160/calendar");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    startDate: "2017-09-01",
    endDate: "2017-09-05",
    isAvailable: 0,
    price: 20,
    minimumStay: 1,
    note: "test",
  });
});

Deno.test("update-calendar: the multi-unit block uses desiredUnitsToSell=0", async () => {
  const { ctx, calls } = mockCtx([envelope([])]);
  await action.execute(
    { listingId: 1, startDate: "2017-09-01", endDate: "2017-09-05", desiredUnitsToSell: 0 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    startDate: "2017-09-01",
    endDate: "2017-09-05",
    desiredUnitsToSell: 0,
  });
});

Deno.test("update-calendar: refuses a call without both interval bounds", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ listingId: 1, startDate: "2017-09-01" }, ctx)),
    Error,
    "startDate",
  );
  assertEquals(calls.length, 0);
});
