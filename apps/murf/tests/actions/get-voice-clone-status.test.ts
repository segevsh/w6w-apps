import { assertEquals } from "@std/assert";
import action from "../../actions/get-voice-clone-status.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("get-voice-clone-status: GETs the status path and returns the body", async () => {
  const body = { requestId: "r/1", status: "COMPLETED", voiceId: "cln_9" };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { requestId: " r/1 " }, ctx);
  assertEquals(calls[0].url, "https://api.murf.ai/v1/speech/voice-clone-creation-status/r%2F1");
  assertEquals(out, body);
});

Deno.test("get-voice-clone-status: requires an id; a 404 fails with the vendor message", async () => {
  assertEquals(
    (await failure(action, { requestId: "" }, mockCtx().ctx)).includes("requestId"),
    true,
  );
  const { ctx } = mockCtx([{ status: 404, body: { error_message: "Not found", error_code: 404 } }]);
  assertEquals((await failure(action, { requestId: "x" }, ctx)).includes("Not found"), true);
});
