import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import sendText from "../../actions/send-text.ts";
import { detailBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("send-text: POST /customers/42/send_text/ with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await sendText.execute({ "customerId": 42, "message": "Hello" } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/customers/42/send_text/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), { "message": "Hello" });
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign");
  assertEquals(out, { "ok": true });
});

test("send-text: a Landbot error surfaces its status and message", async () => {
  const { ctx } = mockCtx([{ status: 412, body: { errors: { detail: ["nope"] } } }]);
  const err = await assertRejects(
    () => Promise.resolve(sendText.execute({ "customerId": 42, "message": "Hello" } as never, ctx)),
    Error,
  );
  assertEquals(err.message.includes("412"), true, err.message);
  assertEquals(err.message.includes("detail: nope"), true, err.message);
});

test("send-text: declares perform", () => {
  assertEquals(sendText.type, "perform");
  assertEquals(detailBody("x"), { detail: "x" });
});
