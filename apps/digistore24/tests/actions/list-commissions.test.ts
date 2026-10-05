import { assertEquals, assertRejects } from "@std/assert";
import listCommissions from "../../actions/list-commissions.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "listCommissions";
const DATA = { "ok": "Y" };

Deno.test("list-commissions: calls listCommissions with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await listCommissions.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("list-commissions: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await listCommissions.execute({
    "from": "-3d",
    "to": "now",
    "transaction_type": "payment",
    "commission_type": "all",
    "purchase_id": "X26QE8GN",
    "page_no": 2,
    "page_size": 50,
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "from": "-3d",
    "to": "now",
    "transaction_type": "payment",
    "commission_type": "all",
    "purchase_id": "X26QE8GN",
    "page_no": "2",
    "page_size": "50",
  });
});

Deno.test("list-commissions: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await listCommissions.execute({}, ctx),
    Error,
    "The API key is invalid.",
  );
});
