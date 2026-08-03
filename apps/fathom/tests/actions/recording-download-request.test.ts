import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-download-request.ts";

Deno.test("recording-download-request: POSTs to the download endpoint with an empty body", async () => {
  const { ctx, calls, logs } = mockCtx([
    {
      status: 202,
      body: { download_id: "dl_abc", recording_id: 123456789, status: "processing" },
    },
  ]);
  const result = await action.execute({ recordingId: 123456789 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/external/v1/recordings/123456789/download");
  // `destination_url` is optional; unset means no key at all, not `null`.
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(result, { download_id: "dl_abc", recording_id: 123456789, status: "processing" });
  assertEquals(logs[0].level, "info");
});

Deno.test("recording-download-request: sends destination_url when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { download_id: "dl_abc" } }]);
  await action.execute({
    recordingId: 1,
    destinationUrl: "https://example.com/destination",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    destination_url: "https://example.com/destination",
  });
});

Deno.test("recording-download-request: an audio-only recording may complete immediately", async () => {
  const { ctx } = mockCtx([
    {
      status: 202,
      body: {
        download_id: "dl_abc",
        recording_id: 1,
        status: "completed",
        audio: { url: "https://media.fathom.ai/downloads/x", content_type: "audio/mp4" },
      },
    },
  ]);
  const result = await action.execute({ recordingId: 1 }, ctx);
  assertEquals(result.status, "completed");
});

Deno.test("recording-download-request: a 422 (no downloadable media) surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: "" }]);
  const err = await assertRejects(async () => await action.execute({ recordingId: 1 }, ctx));
  assert(err instanceof Error);
  assert(err.message.includes("422"));
});

Deno.test("recording-download-request: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
