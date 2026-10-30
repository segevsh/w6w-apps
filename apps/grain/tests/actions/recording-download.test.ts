import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-download.ts";

test("recording-download: GETs the download endpoint and base64-encodes the body", async () => {
  const { ctx, calls } = mockCtx([{
    body: "fake-media-bytes",
    headers: { "content-type": "video/mp4" },
  }]);
  const result = await action.execute({ recordingId: "r1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1/download");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.encoding, "base64");
  assertEquals(result.contentType, "video/mp4");
  assertEquals(atob(result.content), "fake-media-bytes");
});

test("recording-download: throws with status and truncated body on failure", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "recording not found" }]);
  await assertRejects(
    async () => await action.execute({ recordingId: "missing" }, ctx),
    Error,
    "404",
  );
});

test("recording-download: is a read action", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "recording");
});
