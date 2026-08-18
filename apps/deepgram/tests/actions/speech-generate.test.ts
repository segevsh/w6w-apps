import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/speech-generate.ts";

const display = { projectId: "proj_1" };
const ok = { status: 200, body: { request_id: "req_1" } };

/**
 * Without a callback Deepgram streams audio bytes back, and a workflow step has
 * nowhere sensible to put them — so this refuses rather than half working.
 */
Deno.test("speech-generate: requires a callback URL, and explains why", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ text: "hello" }, ctx),
    Error,
    "raw audio bytes",
  );
  assertEquals(calls.length, 0);
});

Deno.test("speech-generate: posts the text and returns a pending request", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  const result = await action.execute!({
    text: "Your appointment is confirmed.",
    callbackUrl: "https://hooks.example.com/audio",
  }, ctx) as { pending: boolean; request_id: string };
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.deepgram.com/v1/speak");
  assertEquals(JSON.parse(calls[0].body!), { text: "Your appointment is confirmed." });
  assertEquals(url.searchParams.get("callback"), "https://hooks.example.com/audio");
  assertEquals(result.pending, true);
  assertEquals(result.request_id, "req_1");
});

Deno.test("speech-generate: a voice and encoding default sensibly", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({ text: "x", callbackUrl: "https://h" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("model"), "aura-2-thalia-en");
  assertEquals(q.get("encoding"), "mp3");
});

/** Telephony wants mulaw at 8000; a mismatch plays as noise rather than failing. */
Deno.test("speech-generate: telephony settings reach the wire", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({
    text: "x",
    callbackUrl: "https://h",
    encoding: "mulaw",
    sampleRate: 8000,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("encoding"), "mulaw");
  assertEquals(q.get("sample_rate"), "8000");
});

Deno.test("speech-generate: a zero sample rate is omitted, not sent", async () => {
  const { ctx, calls } = mockCtx([ok], { display });
  await action.execute!({ text: "x", callbackUrl: "https://h", sampleRate: 0, speed: 0 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("sample_rate"), null);
  assertEquals(q.get("speed"), null);
});

/** The text is somebody's content. */
Deno.test("speech-generate: logs the request id, not the text", async () => {
  const { ctx, logs } = mockCtx([ok], { display });
  await action.execute!({ text: "your balance is overdue", callbackUrl: "https://h" }, ctx);
  assert(!JSON.stringify(logs).includes("overdue"), JSON.stringify(logs));
  assertEquals(logs[0].data, { requestId: "req_1" });
});

Deno.test("speech-generate: needs text", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ callbackUrl: "https://h" }, ctx),
    Error,
    "text",
  );
});
