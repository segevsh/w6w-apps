import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-download-get.ts";

Deno.test("recording-download-get: GETs the nested download path", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        download_id: "dl_CJAj1YPuruCgWHaKgEBv6Mb1UsNj8x",
        recording_id: 123456789,
        status: "completed",
        video: {
          url: "https://media.fathom.ai/downloads/x",
          content_type: "video/mp4",
          file_size_bytes: 154763264,
          expires_at: "2026-07-13T18:30:00Z",
        },
      },
    },
  ]);
  const result = await action.execute({
    recordingId: 123456789,
    downloadId: "dl_CJAj1YPuruCgWHaKgEBv6Mb1UsNj8x",
  }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/external/v1/recordings/123456789/downloads/dl_CJAj1YPuruCgWHaKgEBv6Mb1UsNj8x",
  );
  assertEquals(result.status, "completed");
});

Deno.test("recording-download-get: url-encodes the download id", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "processing" } }]);
  await action.execute({ recordingId: 1, downloadId: "dl/with space" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/external/v1/recordings/1/downloads/dl%2Fwith%20space",
  );
});

Deno.test("recording-download-get: both ids are required", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.find((p) => p.key === "recordingId")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "downloadId")?.required, true);
});
