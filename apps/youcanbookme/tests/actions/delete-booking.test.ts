import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-booking.ts";

test("delete-booking: DELETEs /{accountId}/profiles/{profileId}/bookings/{bookingId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await action.execute(
    { accountId: "acc-1", profileId: "prof-1", bookingId: "book-1" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/acc-1/profiles/prof-1/bookings/book-1");
  assertEquals(result, undefined);
});
