import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-create-transcript.ts";

Deno.test("recording-create-transcript: wraps the options under the provider key", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", status: { code: "processing" } } }]);
  const out = await action.execute!({
    id: "r1",
    provider: "recallai_async",
    providerOptions: '{"language_code":"en"}',
    separateStreams: true,
    metadata: { k: "v" },
  }, { ...ctx, invocation: { invocationId: "inv-9" } } as never);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/recording/r1/create_transcript/");
  assertEquals(calls[0].headers["idempotency-key"], "inv-9");
  assertEquals(JSON.parse(calls[0].body!), {
    provider: { recallai_async: { language_code: "en" } },
    diarization: { use_separate_streams_when_available: true },
    metadata: { k: "v" },
  });
  assertEquals(out, { id: "t1", status: { code: "processing" } });
});

Deno.test("recording-create-transcript: options default to {} and are optional", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ id: "r1", provider: "deepgram_async" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { provider: { deepgram_async: {} } });
  assertEquals(action.idempotent, false);
});

Deno.test("recording-create-transcript: a rate limit is reported", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "20" },
    body: { detail: "throttled" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "r1", provider: "recallai_async" }, ctx),
    Error,
    "HTTP 429",
  );
});
