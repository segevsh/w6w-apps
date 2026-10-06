import { assertEquals } from "@std/assert";
import reservationMessageSend from "../../actions/reservation-message-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("reservation-message-send: POST body, images split from text, 202 reference returned", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: { sent_reference_id: "ref1" } } }]);
  const out = await reservationMessageSend.execute({
    uuid: "r1",
    body: "Welcome!",
    images: "https://a/1.png, https://a/2.png",
    sender_id: "t1",
  }, ctx) as { data: { sent_reference_id: string } };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/reservations/r1/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    body: "Welcome!",
    images: ["https://a/1.png", "https://a/2.png"],
    sender_id: "t1",
  });
  assertEquals(out.data.sent_reference_id, "ref1");
  assertEquals(reservationMessageSend.idempotent, false);
  assertEquals(requiredOf(reservationMessageSend), ["body", "uuid"]);

  const bare = mockCtx([{ status: 202, body: { data: { sent_reference_id: "r" } } }]);
  await reservationMessageSend.execute({ uuid: "r1", body: "x" }, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { body: "x" });
});
