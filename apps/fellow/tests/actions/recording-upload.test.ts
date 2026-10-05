import { assertEquals, assertRejects } from "@std/assert";
import recordingUpload from "../../actions/recording-upload.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recording-upload: POST /api/v1/recordings/upload on the workspace host", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { recording_id: "r9" } }]);
  const out = await recordingUpload.execute({
    url: "https://x.test/a.mp3",
    title: "Call",
    languageCode: "en_us",
    mediaAuthType: "bearer_token",
    mediaBearerToken: "tok",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).host, "acme.fellow.app");
  assertEquals(pathOf(calls[0].url), "/api/v1/recordings/upload");
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign()");
  assertEquals(bodyOf(calls[0]), {
    url: "https://x.test/a.mp3",
    title: "Call",
    language_code: "en_us",
    media_auth: { type: "bearer_token", token: "tok" },
  });
  assertEquals((out as { recording_id: string }).recording_id, "r9");
});

Deno.test("recording-upload: a Fellow error surfaces its detail and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "Forbidden for this key" } }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        recordingUpload.execute({
          url: "https://x.test/a.mp3",
          title: "Call",
          languageCode: "en_us",
          mediaAuthType: "bearer_token",
          mediaBearerToken: "tok",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("403"), true, err.message);
  assertEquals(err.message.includes("Forbidden for this key"), true, err.message);
});
