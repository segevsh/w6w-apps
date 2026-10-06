import { assertEquals } from "@std/assert";
import action from "../../actions/transcription-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("transcription-get: the response is a bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, call_id: "c1" }] }]);
  const out = await action.execute!({ callId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/transcriptions/c1");
  assertEquals(out, { transcriptions: [{ id: 1, call_id: "c1" }] });
});

Deno.test("transcription-get: an empty body is an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ callId: "c1" }, ctx), { transcriptions: [] });
});
