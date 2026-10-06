import { assertEquals } from "@std/assert";
import createCall from "../../actions/create-call.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-call: POST /calls maps call_time_int, call_result and recording_link", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ call: { id: "k1" } }) }]);
  const out = await createCall.execute({
    contactId: "c1",
    callResult: "interested",
    callTime: 1765456800,
    phoneNumber: "+353 1 234",
    via: "phone",
    recordingLink: "https://example.com/r.mp3",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/calls");
  assertEquals(bodyOf(calls[0]), {
    contact_id: "c1",
    call_result: "interested",
    call_time_int: 1765456800,
    phone_number: "+353 1 234",
    via: "phone",
    recording_link: "https://example.com/r.mp3",
  });
  assertEquals(out.call, { id: "k1" });
  assertEquals(createCall.idempotent, false);
});
