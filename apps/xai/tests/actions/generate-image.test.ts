import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/generate-image.ts";

Deno.test("generate-image: calls POST /v1/images/generations on api.x.ai and returns the body", async () => {
  const reply = { ok: true };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    prompt: "a cat",
    aspectRatio: "16:9",
    resolution: "2k",
    n: 2,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.x.ai");
  assertEquals(url.pathname, "/v1/images/generations");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  const b = JSON.parse(calls[0].body!);
  assertEquals(b.prompt, "a cat");
  assertEquals(b.aspect_ratio, "16:9");
  assertEquals(b.resolution, "2k");
  assertEquals(b.n, 2);
  assertEquals(result, reply);
});

Deno.test("generate-image: surfaces the vendor error code on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "invalid-argument", error: "bad" } }]);
  let message = "";
  try {
    await action.execute!({ prompt: "a cat", aspectRatio: "16:9", resolution: "2k", n: 2 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("400") && message.includes("[invalid-argument]"), message);
});
