import { assertEquals, assertRejects } from "@std/assert";
import recordingGet from "../../actions/recording-get.ts";
import { detail, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("recording-get: GET /v1/recordings/?meeting_uuid= returns the URLs", async () => {
  const body = { uuid: "r1", audio_url: "https://a", video_url: "https://v", valid_till: "x" };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await recordingGet.execute({ meetingUuid: "m1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/recordings/");
  assertEquals(queryOf(calls[0].url), { meeting_uuid: "m1" });
  assertEquals(out, body);
});

Deno.test("recording-get: a 202 (still processing) is a success without URLs", async () => {
  const body = { uuid: "r1", meeting_uuid: "m1", message: "Recording is processing" };
  const { ctx } = mockCtx([{ status: 202, body }]);
  const out = await recordingGet.execute({ meetingUuid: "m1" }, ctx) as Record<string, unknown>;
  assertEquals(out.audio_url, undefined);
  assertEquals(out.message, "Recording is processing");
});

Deno.test("recording-get: a 429 is reported with the vendor's detail", async () => {
  const { ctx } = mockCtx([{ status: 429, body: detail("Request was throttled.") }]);
  await assertRejects(
    async () => await recordingGet.execute({ meetingUuid: "m1" }, ctx),
    Error,
    "429: Request was throttled.",
  );
});
