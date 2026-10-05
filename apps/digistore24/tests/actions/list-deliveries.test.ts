import { assertEquals, assertRejects } from "@std/assert";
import listDeliveries from "../../actions/list-deliveries.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "listDeliveries";
const DATA = { "ok": "Y" };

Deno.test("list-deliveries: calls listDeliveries with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await listDeliveries.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("list-deliveries: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await listDeliveries.execute({
    "purchase_id": "X26QE8GN",
    "from": "2026-01-01",
    "to": "2026-02-01",
    "type": "request",
    "same_address_as": "55",
    "is_processed": true,
    "is_test_order": "N",
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "search[purchase_id]": "X26QE8GN",
    "search[from]": "2026-01-01",
    "search[to]": "2026-02-01",
    "search[type]": "request",
    "search[same_address_as]": "55",
    "search[is_processed]": "Y",
    "search[is_test_order]": "N",
  });
});

Deno.test("list-deliveries: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await listDeliveries.execute({}, ctx),
    Error,
    "The API key is invalid.",
  );
});
