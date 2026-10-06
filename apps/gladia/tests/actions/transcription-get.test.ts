import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/transcription-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcription-get: GETs /v2/pre-recorded/{id} and returns the job", async () => {
  const job = { id: "j 1", status: "done", result: { transcription: { full_transcript: "hi" } } };
  const { ctx, calls } = mockCtx([{ body: job }]);
  const out = await action.execute({ transcriptionId: "j 1" }, ctx);
  assertEquals(out, job);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/pre-recorded/j%201");
});

Deno.test("transcription-get: an error-status job is returned, not thrown", async () => {
  const job = { id: "j", status: "error", error_code: 500 };
  const out = await action.execute({ transcriptionId: "j" }, mockCtx([{ body: job }]).ctx);
  assertEquals((out as typeof job).status, "error");
});

Deno.test("transcription-get: 404 throws with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "job not found") }]);
  const err = await assertRejects(
    async () => await action.execute({ transcriptionId: "x" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("job not found"), true);
});
