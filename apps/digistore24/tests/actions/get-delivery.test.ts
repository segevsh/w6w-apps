import { assertEquals, assertRejects } from "@std/assert";
import getDelivery from "../../actions/get-delivery.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "getDelivery";
const DATA = { "ok": "Y" };

Deno.test("get-delivery: calls getDelivery with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await getDelivery.execute({ "delivery_id": 55 }, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), { "delivery_id": "55" });
  assertEquals(out, DATA);
});

Deno.test("get-delivery: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await getDelivery.execute({ "delivery_id": 55, "set_in_progress": true }, ctx);
  assertEquals(fieldsOf(calls[0]), { "delivery_id": "55", "set_in_progress": "Y" });
});

Deno.test("get-delivery: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await getDelivery.execute({ "delivery_id": 55 }, ctx),
    Error,
    "The API key is invalid.",
  );
});
