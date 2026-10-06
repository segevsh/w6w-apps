import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-response.ts";

Deno.test("create-response: calls POST /v1/responses on api.x.ai and returns the body", async () => {
  const reply = { ok: true };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    model: "grok-x",
    input: "hello",
    previousResponseId: "resp_1",
    store: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.x.ai");
  assertEquals(url.pathname, "/v1/responses");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  const b = JSON.parse(calls[0].body!);
  assertEquals(b.input, "hello");
  assertEquals(b.previous_response_id, "resp_1");
  assertEquals(b.store, false);
  assertEquals(result, reply);
});

Deno.test("create-response: surfaces the vendor error code on failure", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { code: "invalid-argument", error: "bad" } }]);
  let message = "";
  try {
    await action.execute!({
      model: "grok-x",
      input: "hello",
      previousResponseId: "resp_1",
      store: false,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("400") && message.includes("[invalid-argument]"), message);
});

Deno.test("create-response: a JSON-array input is parsed into input items", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "m", input: '[{"role":"user","content":"x"}]' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).input, [{ role: "user", content: "x" }]);
});
