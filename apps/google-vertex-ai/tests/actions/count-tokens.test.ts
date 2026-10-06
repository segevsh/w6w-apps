import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import count from "../../actions/count-tokens.ts";

const display = { projectId: "p1", location: "europe-west4" };
const BASE = "https://europe-west4-aiplatform.googleapis.com/v1/projects/p1/locations/europe-west4";

Deno.test("count-tokens: POSTs contents to :countTokens", async () => {
  const { ctx, calls } = mockCtx([{ body: { totalTokens: 3, totalBillableCharacters: 7 } }], {
    display,
  });
  const out = await count.execute!({
    model: "publishers/google/models/gemini-2.5-pro",
    contents: [{ role: "user", parts: [{ text: "hi there" }] }],
  }, ctx);
  assertEquals(calls[0].url, `${BASE}/publishers/google/models/gemini-2.5-pro:countTokens`);
  assertEquals(JSON.parse(calls[0].body!), {
    contents: [{ role: "user", parts: [{ text: "hi there" }] }],
  });
  assertEquals(out, { totalTokens: 3, totalBillableCharacters: 7 });
});
