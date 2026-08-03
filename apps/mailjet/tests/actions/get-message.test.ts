import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getMessage from "../../actions/get-message.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1 }], Total: 1 } };

// ------------------------------------------------------------------ get-message

Deno.test("get-message: GETs the message by ID", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await getMessage.execute!({ messageId: "70650219165027410" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/message/70650219165027410");
});

Deno.test("get-message: takes the ID as a string so a large ID survives intact", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  const big = "70650219165027410";
  await getMessage.execute!({ messageId: big }, ctx);
  assert(calls[0].url.endsWith(big), calls[0].url);
  assertEquals(getMessage.params?.[0].type, "string");
});
