import { assertEquals, assertRejects } from "@std/assert";
import speechCreate, { toBase64 } from "../../actions/speech-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("toBase64: encodes bytes, including a buffer past the chunk size", () => {
  assertEquals(toBase64(new Uint8Array([72, 105])), "SGk=");
  const big = new Uint8Array(0x8000 * 2 + 5).fill(65);
  assertEquals(atob(toBase64(big)).length, big.length);
});

Deno.test("speech-create: returns base64 audio with cost and provider from the headers", async () => {
  const { ctx, calls } = mockCtx([{
    headers: {
      "content-type": "audio/mpeg",
      "x-edenai-cost": "0.002",
      "x-edenai-provider": "openai",
    },
    body: "Hi",
  }]);
  const out = await speechCreate.execute({
    model: "openai/tts-1",
    input: "Hello",
    voice: "alloy",
    responseFormat: "mp3",
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/audio/speech");
  assertEquals(bodyOf(calls[0]), {
    model: "openai/tts-1",
    input: "Hello",
    voice: "alloy",
    response_format: "mp3",
  });
  assertEquals(out.audioBase64, "SGk=");
  assertEquals(out.contentType, "audio/mpeg");
  assertEquals(out.bytes, 2);
  assertEquals(out.cost, 0.002);
  assertEquals(out.provider, "openai");
});

Deno.test("speech-create: missing or unparseable cost header is left unset", async () => {
  const { ctx } = mockCtx([{
    headers: { "content-type": "audio/wav", "x-edenai-cost": "n/a" },
    body: "x",
  }]);
  const out = await speechCreate.execute({ model: "m", input: "t" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.cost, undefined);
});

Deno.test("speech-create: a vendor error is thrown, not returned as audio", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { detail: [{ loc: ["body", "voice"], msg: "unknown voice" }] },
  }]);
  await assertRejects(
    async () => await speechCreate.execute({ model: "m", input: "t" }, ctx),
    Error,
    "unknown voice",
  );
});
