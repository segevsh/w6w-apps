import { assertEquals } from "@std/assert";
import reservationMessagesList from "../../actions/reservation-messages-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reservation-messages-list: GET .../messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ body: "hi" }] } }]);
  const out = await reservationMessagesList.execute({ uuid: "r1" }, ctx) as { data: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/reservations/r1/messages");
  assertEquals(out.data.length, 1);
});
