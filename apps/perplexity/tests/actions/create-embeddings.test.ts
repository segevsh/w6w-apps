import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-embeddings.ts";

Deno.test("create-embeddings: POSTs /v1/embeddings with model + input only", async () => {
  const body = { object: "list", data: [{ object: "embedding", index: 0, embedding: "AAA=" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { model: "pplx-embed-v1-0.6b", input: "hello world" },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/embeddings");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { model: "pplx-embed-v1-0.6b", input: "hello world" });
  assertEquals(result, body);
});

Deno.test("create-embeddings: accepts an array input", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "pplx-embed-v1-4b", input: ["a", "b"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).input, ["a", "b"]);
});

Deno.test("create-embeddings: forwards dimensions and encoding format", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "pplx-embed-v1-4b", input: "x", dimensions: 512, encodingFormat: "base64_binary" },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.dimensions, 512);
  assertEquals(sent.encoding_format, "base64_binary");
});

Deno.test("create-embeddings: omits undefined optional params from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "pplx-embed-v1-0.6b", input: "x" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["input", "model"]);
});
