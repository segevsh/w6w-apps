import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import transcriptionGet from "../../actions/transcription-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("transcription-get: GET /v1/transcriptions/{uuid}/", async () => {
  const body = { uuid: "t1", transcript: [{ speaker_id: 0, transcript: "hi", timestamps: [0.1] }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await transcriptionGet.execute({ transcriptionUuid: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/transcriptions/t1/");
  assertEquals(out, body);
});

test("transcription-get: a blank uuid is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await transcriptionGet.execute({ transcriptionUuid: "" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
