import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import callTranscriptGet from "../../actions/call-transcript-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("call-transcript-get: GETs /v1/call-transcripts/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { callId: "call1", status: "completed" } },
  }]);
  await callTranscriptGet.execute({ id: "call1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/call-transcripts/call1");
});

test("call-transcript-get: is a read action", () => {
  assertEquals(callTranscriptGet.type, "read");
});
