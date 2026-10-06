import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-embedding.ts";

Deno.test("create-embedding: calls POST /v1/embeddings on api.x.ai and returns the body", async () => {
  const reply = { ok: true };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({ model: "emb", input: "one", dimensions: 8 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.x.ai");
  assertEquals(url.pathname, "/v1/embeddings");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  const b = JSON.parse(calls[0].body!);
  assertEquals(b.input, ["one"]);
  assertEquals(b.dimensions, 8);
  assertEquals(result, reply);
});

Deno.test("create-embedding: surfaces the vendor error code on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "invalid-argument", error: "bad" } }]);
  let message = "";
  try {
    await action.execute!({ model: "emb", input: "one", dimensions: 8 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("400") && message.includes("[invalid-argument]"), message);
});

Deno.test("create-embedding: a JSON array input is passed through as an array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "m", input: '["a","b"]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).input, ["a", "b"]);
});
