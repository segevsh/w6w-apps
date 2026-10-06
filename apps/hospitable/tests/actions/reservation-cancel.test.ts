import { assert, assertEquals } from "@std/assert";
import reservationCancel from "../../actions/reservation-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reservation-cancel: POST .../cancel with initiated_by", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "r1" } } }]);
  await reservationCancel.execute({ uuid: "r1", initiated_by: "guest" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/reservations/r1/cancel");
  assertEquals(JSON.parse(calls[0].body!), { initiated_by: "guest" });
  const bare = mockCtx([{ body: { data: {} } }]);
  await reservationCancel.execute({ uuid: "r1" }, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), {});
  assertEquals(reservationCancel.idempotent, false);
});

Deno.test("reservation-cancel: validation errors carry the field messages", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { message: "The given data was invalid.", errors: { check_in: ["Dates unavailable."] } },
  }]);
  let message = "";
  try {
    await reservationCancel.execute({ uuid: "r1" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("422") && message.includes("check_in: Dates unavailable."), message);
});
