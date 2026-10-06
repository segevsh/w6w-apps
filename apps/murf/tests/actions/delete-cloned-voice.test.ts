import { assertEquals } from "@std/assert";
import action from "../../actions/delete-cloned-voice.ts";
import { exec, failure, mockCtx } from "../_helpers.ts";

Deno.test("delete-cloned-voice: DELETEs the voice and returns the envelope", async () => {
  const body = { responseCode: "SUCCESS", responseMessage: "Deleted" };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await exec(action, { voiceId: "cln_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.murf.ai/v1/speech/voices/cloned/cln_1");
  assertEquals(calls[0].body, null);
  assertEquals(out, body);
});

Deno.test("delete-cloned-voice: requires an id; a 404 fails", async () => {
  assertEquals((await failure(action, { voiceId: " " }, mockCtx().ctx)).includes("voiceId"), true);
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_message: "No such voice", error_code: 404 },
  }]);
  assertEquals((await failure(action, { voiceId: "cln_x" }, ctx)).includes("No such voice"), true);
});
