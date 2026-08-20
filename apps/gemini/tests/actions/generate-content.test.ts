import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/generate-content.ts";

Deno.test("generate-content: POSTs to /models/{model}:generateContent with contents", async () => {
  const { ctx, calls } = mockCtx([{ body: { candidates: [] } }]);
  await action.execute!(
    {
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models/gemini-3.5-flash:generateContent");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contents, [{ role: "user", parts: [{ text: "hi" }] }]);
  assertEquals("generationConfig" in body, false);
  assertEquals("systemInstruction" in body, false);
});

Deno.test("generate-content: accepts a bare model id or a full models/… name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ model: "gemini-3.5-flash", contents: [] }, ctx);
  await action.execute!({ model: "models/gemini-3.5-flash", contents: [] }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models/gemini-3.5-flash:generateContent");
  assertEquals(new URL(calls[1].url).pathname, "/v1beta/models/gemini-3.5-flash:generateContent");
});

Deno.test("generate-content: folds generation params into generationConfig", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "hi" }] }],
      temperature: 0.4,
      topP: 0.9,
      topK: 32,
      maxOutputTokens: 256,
      candidateCount: 2,
      stopSequences: ["STOP"],
      responseMimeType: "application/json",
      presencePenalty: 0.1,
      frequencyPenalty: 0.2,
      seed: 7,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.generationConfig, {
    temperature: 0.4,
    topP: 0.9,
    topK: 32,
    maxOutputTokens: 256,
    candidateCount: 2,
    stopSequences: ["STOP"],
    responseMimeType: "application/json",
    presencePenalty: 0.1,
    frequencyPenalty: 0.2,
    seed: 7,
  });
});

Deno.test("generate-content: wraps a plain-text systemInstruction as a Content", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "gemini-3.5-flash", contents: [], systemInstruction: "Be concise." },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.systemInstruction, { parts: [{ text: "Be concise." }] });
});

Deno.test("generate-content: forwards safetySettings verbatim when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const safetySettings = [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" }];
  await action.execute!({ model: "gemini-3.5-flash", contents: [], safetySettings }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.safetySettings, safetySettings);
});

// ── Function calling and response schemas ──────────────────────────────────

Deno.test("generate-content: forwards tools and toolConfig at the top level", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const tools = [{ functionDeclarations: [{ name: "get_weather" }] }];
  const toolConfig = { functionCallingConfig: { mode: "ANY" } };
  await action.execute!(
    { model: "gemini-3.5-flash", contents: [], tools, toolConfig },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  // `tools` sits beside `contents`, NOT inside `generationConfig`.
  assertEquals(body.tools, tools);
  assertEquals(body.toolConfig, toolConfig);
  assertEquals(body.generationConfig, undefined);
});

Deno.test("generate-content: responseSchema rides in generationConfig alongside JSON output", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const responseSchema = { type: "object" };
  await action.execute!(
    {
      model: "gemini-3.5-flash",
      contents: [],
      responseMimeType: "application/json",
      responseSchema,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).generationConfig.responseSchema, responseSchema);
});

Deno.test("generate-content: a responseSchema without JSON output rejects rather than no-op", async () => {
  const { ctx, calls } = mockCtx();
  let threw = false;
  try {
    await action.execute!(
      { model: "gemini-3.5-flash", contents: [], responseSchema: { type: "object" } },
      ctx,
    );
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("application/json"), true);
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
