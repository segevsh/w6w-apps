import { assert, assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-reservation.ts";

Deno.test("create-reservation: POSTs the documented body and query parameters", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 117277 })]);
  await action.execute(
    {
      channelId: 2000,
      listingMapId: 40160,
      arrivalDate: "2019-05-19",
      departureDate: "2019-05-20",
      guestName: "Andrew Peterson",
      numberOfGuests: 2,
      totalPrice: 267,
      currency: "USD",
      forceOverbooking: 1,
      provider: "testProvider",
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/reservations");
  assertEquals(url.searchParams.get("forceOverbooking"), "1");
  assertEquals(url.searchParams.get("provider"), "testProvider");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    channelId: 2000,
    listingMapId: 40160,
    arrivalDate: "2019-05-19",
    departureDate: "2019-05-20",
    guestName: "Andrew Peterson",
    numberOfGuests: 2,
    totalPrice: 267,
    currency: "USD",
  });
});

Deno.test("create-reservation: only the documented create channels are selectable", () => {
  const channel = action.params?.find((p) => p.key === "channelId");
  assertEquals(
    (channel?.options as Array<{ value: number }>).map((o) => o.value),
    [2000, 2002, 2020],
  );
});

Deno.test("create-reservation: requires the four documented required fields", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "channelId");
  await assertRejects(
    () => Promise.resolve(action.execute({ channelId: 2000 }, ctx)),
    Error,
    "listingMapId",
  );
  await assertRejects(
    () => Promise.resolve(action.execute({ channelId: 2000, listingMapId: 1 }, ctx)),
    Error,
    "arrivalDate",
  );
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ channelId: 2000, listingMapId: 1, arrivalDate: "2019-05-19" }, ctx),
      ),
    Error,
    "departureDate",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-reservation: rejects an over-long provider before spending a request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(action.execute({
        channelId: 2000,
        listingMapId: 1,
        arrivalDate: "2019-05-19",
        departureDate: "2019-05-20",
        provider: "x".repeat(51),
      }, ctx)),
    Error,
    "50 characters",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-reservation: couponName travels inside the reservation object, as documented", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1 })]);
  await action.execute({
    channelId: 2020,
    listingMapId: 1,
    arrivalDate: "2019-05-19",
    departureDate: "2019-05-20",
    couponName: "SPRING",
  }, ctx);
  assert(calls[0].body!.includes('"couponName":"SPRING"'));
  assert("couponName" in JSON.parse(calls[0].body!));
});
