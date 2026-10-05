import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import submit from "../../actions/transcription-submit.ts";
import get from "../../actions/transcription-get.ts";

const D = { display: { region: "us" } };
const BASE = "https://platform-us.plaud.ai/developer/api/open/partner/ai/transcriptions";

Deno.test("transcription-submit: POSTs file_url with nested params", async () => {
  const { ctx, calls } = mockCtx([{
    body: { transcription_id: "task_exec_1", status: "PENDING", data: {} },
  }], D);
  const out = await submit.execute({
    fileUrl: "https://example.com/a.mp3",
    language: "en-US",
    diarization: true,
    decodeSilence: false,
    hotwords: "plaud,gpt",
    detectionLevel: "chapter",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/`);
  assertEquals(JSON.parse(calls[0].body!), {
    file_url: "https://example.com/a.mp3",
    params: {
      transcribe: { language: "en-US", detection_level: "chapter" },
      vad: { decode_silence: false },
      diarization: { enabled: true },
      hotwords: "plaud,gpt",
    },
  });
  assertEquals(out, { transcriptionId: "task_exec_1", status: "PENDING" });
});

Deno.test("transcription-submit: only the url is required; model is sent only when set", async () => {
  const bare = mockCtx([{ body: { transcription_id: "t", status: "PENDING" } }], D);
  await submit.execute({ fileUrl: "https://example.com/a.mp3" }, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { file_url: "https://example.com/a.mp3" });
  const withModel = mockCtx([{ body: { transcription_id: "t" } }], D);
  await submit.execute(
    { fileUrl: "https://example.com/a.mp3", model: "plaud-fast-whisper" },
    withModel.ctx,
  );
  assertEquals(JSON.parse(withModel.calls[0].body!).params.transcribe.model, "plaud-fast-whisper");
});

Deno.test("transcription-submit: rejects a missing or non-http url", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(() => Promise.resolve(submit.execute({}, ctx)), Error, "fileUrl");
  await assertRejects(
    () => Promise.resolve(submit.execute({ fileUrl: "file:///a.mp3" }, ctx)),
    Error,
    "http",
  );
  assertEquals(calls.length, 0);
});

Deno.test("transcription-get: SUCCESS maps text, duration and OpenAPI `results` segments", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      transcription_id: "task_exec_1",
      status: "SUCCESS",
      data: {
        text: "Meeting started at 10am.",
        language: "en",
        duration: 1843,
        results: [{
          start: 0,
          end: 4.2,
          text: "Meeting started at 10am.",
          speaker_id: "Speaker 1",
          language: "en-US",
        }],
      },
    },
  }], D);
  const out = await get.execute({ transcriptionId: "task_exec_1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${BASE}/task_exec_1`);
  assertEquals(out.done, true);
  assertEquals(out.inProgress, false);
  assertEquals(out.text, "Meeting started at 10am.");
  assertEquals((out.segments as Array<Record<string, unknown>>)[0].speaker, "Speaker 1");
});

Deno.test("transcription-get: also reads the prose example's `segments`/`speaker` shape", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: "SUCCESS",
      data: { segments: [{ start: 0, end: 1, text: "Hi", speaker: "Speaker 2" }] },
    },
  }], D);
  const out = await get.execute({ transcriptionId: "t" }, ctx) as {
    segments: Array<Record<string, unknown>>;
  };
  assertEquals(out.segments[0].speaker, "Speaker 2");
});

Deno.test("transcription-get: classifies in-progress and terminal-failure statuses", async () => {
  for (
    const [status, inProgress, failed] of [["PROGRESS", true, false], ["FAILURE", false, true], [
      "REVOKED",
      false,
      true,
    ]] as const
  ) {
    const { ctx } = mockCtx([{ body: { transcription_id: "t", status, data: {} } }], D);
    const out = await get.execute({ transcriptionId: "t" }, ctx) as Record<string, unknown>;
    assertEquals([out.inProgress, out.failed, out.done], [inProgress, failed, false], status);
    assertEquals(out.text, null);
  }
});

Deno.test("transcription-get: requires an id and url-encodes it", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "PENDING" } }], D);
  await assertRejects(() => Promise.resolve(get.execute({}, ctx)), Error, "transcriptionId");
  await get.execute({ transcriptionId: "a/b" }, ctx);
  assertEquals(calls[0].url, `${BASE}/a%2Fb`);
});
