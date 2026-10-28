import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import generate from "../../actions/generate-content.ts";

const display = { projectId: "p1", location: "europe-west4" };
const BASE = "https://europe-west4-aiplatform.googleapis.com/v1/projects/p1/locations/europe-west4";

Deno.test("generate-content: POSTs to the regional publisher model with generationConfig", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      candidates: [{
        content: { parts: [{ text: "hmm", thought: true }, { text: "Hel" }, { text: "lo" }] },
      }],
      usageMetadata: { totalTokenCount: 5 },
    },
  }], { display });
  const out = await generate.execute!({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: "hi" }] }],
    systemInstruction: "be brief",
    temperature: 0.2,
    maxOutputTokens: 50,
  }, ctx) as { text: string; usageMetadata: unknown };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${BASE}/publishers/google/models/gemini-2.5-flash:generateContent`);
  assertEquals(JSON.parse(calls[0].body!), {
    contents: [{ role: "user", parts: [{ text: "hi" }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 50 },
    systemInstruction: { parts: [{ text: "be brief" }] },
  });
  assertEquals(out.text, "Hello"); // the thought part is excluded
  assertEquals(out.usageMetadata, { totalTokenCount: 5 });
  // credentials are never set by an action
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("generate-content: location override picks the host; JSON strings parse", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await generate.execute!({
    model: "gemini-2.5-flash",
    location: "global",
    contents: '[{"role":"user","parts":[{"text":"x"}]}]',
    responseMimeType: "application/json",
    responseSchema: '{"type":"OBJECT"}',
  }, ctx);
  assert(
    calls[0].url.startsWith("https://aiplatform.googleapis.com/v1/projects/p1/locations/global/"),
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.generationConfig, {
    responseMimeType: "application/json",
    responseSchema: { type: "OBJECT" },
  });
});

Deno.test("generate-content: guards — schema without JSON mime, missing contents, bad location", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    () => Promise.resolve(generate.execute!({ model: "m", contents: [], responseSchema: {} }, ctx)),
    Error,
    "application/json",
  );
  await assertRejects(
    () => Promise.resolve(generate.execute!({ model: "m" }, ctx)),
    Error,
    "`contents` is required",
  );
  await assertRejects(
    () =>
      Promise.resolve(generate.execute!({ model: "m", contents: [{}], location: "evil.com" }, ctx)),
    Error,
    "unknown Vertex AI location",
  );
});
