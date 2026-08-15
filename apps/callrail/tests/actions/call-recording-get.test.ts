import { assertEquals } from "@std/assert";
import callRecordingGet from "../../actions/call-recording-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-recording-get: hits the recording endpoint and returns the url verbatim", async () => {
  const { ctx, calls } = mockCtx([{
    body: { url: "http://app.callrail.com/calls/CAL1/recording/redirect?access_key=xyz" },
  }]);
  const out = await callRecordingGet.execute({ accountId: "ACC1", callId: "CAL1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/calls/CAL1/recording.json");
  assertEquals(out, {
    url: "http://app.callrail.com/calls/CAL1/recording/redirect?access_key=xyz",
  });
});

Deno.test("call-recording-get: also passes through the HIPAA temporary-URL shape unmodified", async () => {
  const { ctx } = mockCtx([{
    body: { url: "https://calltrk-production.s3.amazonaws.com/calls/recordings/test.mp3" },
  }]);
  const out = await callRecordingGet.execute({ accountId: "ACC1", callId: "CAL1" }, ctx);
  assertEquals(out, {
    url: "https://calltrk-production.s3.amazonaws.com/calls/recordings/test.mp3",
  });
});
