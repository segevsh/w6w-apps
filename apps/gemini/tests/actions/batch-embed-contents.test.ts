import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/batch-embed-contents.ts";

Deno.test("batch-embed-contents: builds one request per text, all sharing the batch model", async () => {
  const { ctx, calls } = mockCtx([{ body: { embeddings: [] } }]);
  await action.execute!(
    { model: "gemini-embedding-001", texts: ["a", "b", "c"] },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1beta/models/gemini-embedding-001:batchEmbedContents",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.requests, [
    { model: "models/gemini-embedding-001", content: { parts: [{ text: "a" }] } },
    { model: "models/gemini-embedding-001", content: { parts: [{ text: "b" }] } },
    { model: "models/gemini-embedding-001", content: { parts: [{ text: "c" }] } },
  ]);
});

Deno.test("batch-embed-contents: applies taskType to every request when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "gemini-embedding-001", texts: ["a", "b"], taskType: "CLUSTERING" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  for (const req of body.requests) {
    assertEquals(req.embedContentConfig, { taskType: "CLUSTERING" });
  }
});
