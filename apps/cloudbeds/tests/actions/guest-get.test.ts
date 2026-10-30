import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import guestGet from "../../actions/guest-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("guest-get: GET /getGuest by guestID", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ guestID: "g1", guestFirstName: "Ada" }) }]);
  await guestGet.execute({ guestID: "g1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1.3/getGuest");
  assertEquals(queryOf(calls[0].url), { guestID: "g1" });
});

test("guest-get: GET /getGuest by reservationID", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ guestID: "g1" }) }]);
  await guestGet.execute({ reservationID: "r1" }, ctx);
  assertEquals(queryOf(calls[0].url), { reservationID: "r1" });
});
