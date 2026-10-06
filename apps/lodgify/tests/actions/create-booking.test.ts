import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import createBooking from "../../actions/create-booking.ts";

Deno.test("create-booking: builds the v1 body from a single room and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 4242 }]);
  const out = await createBooking.execute({
    propertyId: 5,
    arrival: "2026-08-01",
    departure: "2026-08-05",
    status: "Booked",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    roomTypeId: 6,
    adults: 2,
    children: 1,
    enquiryId: 99,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/reservation/booking");
  assertEquals(queryOf(calls[0].url), { from: "99" });
  assertEquals(JSON.parse(calls[0].body!), {
    arrival: "2026-08-01",
    departure: "2026-08-05",
    property_id: 5,
    status: "Booked",
    rooms: [{ room_type_id: 6, guest_breakdown: { adults: 2, children: 1 } }],
    guest: { guest_name: { first_name: "Ada", last_name: "Lovelace" }, email: "ada@example.com" },
  });
  assertEquals(out, { id: 4242 });
});

Deno.test("create-booking: `rooms` overrides the single-room fields; deprecated fields never sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 1 }]);
  const rooms = [{ room_type_id: 1, guest_breakdown: { adults: 3 } }];
  await createBooking.execute({
    propertyId: 5,
    arrival: "2026-08-01",
    departure: "2026-08-05",
    firstName: "Ada",
    rooms: JSON.stringify(rooms),
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.rooms, rooms);
  assertEquals("people" in sent.rooms[0], false);
  assertEquals("name" in sent.guest, false);
});

Deno.test("create-booking: needs a room type or `rooms`", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(createBooking.execute({
        propertyId: 5,
        arrival: "2026-08-01",
        departure: "2026-08-05",
        firstName: "Ada",
      }, ctx)),
    Error,
    "roomTypeId",
  );
  assertEquals(calls.length, 0);
});
