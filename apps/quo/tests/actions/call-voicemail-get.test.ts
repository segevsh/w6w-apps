import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import callVoicemailGet from "../../actions/call-voicemail-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("call-voicemail-get: GETs /v1/call-voicemails/{callId}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "vm1", status: "in-progress" } },
  }]);
  await callVoicemailGet.execute({ callId: "call1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/call-voicemails/call1");
});

test("call-voicemail-get: is a read action", () => {
  assertEquals(callVoicemailGet.type, "read");
});
