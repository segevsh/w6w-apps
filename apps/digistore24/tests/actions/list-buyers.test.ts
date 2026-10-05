import { assertEquals, assertRejects } from "@std/assert";
import listBuyers from "../../actions/list-buyers.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "listBuyers";
const DATA = { "ok": "Y" };

Deno.test("list-buyers: calls listBuyers with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await listBuyers.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("list-buyers: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await listBuyers.execute({ "page_no": 2, "page_size": 50 }, ctx);
  assertEquals(fieldsOf(calls[0]), { "page_no": "2", "page_size": "50" });
});

Deno.test("list-buyers: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await listBuyers.execute({}, ctx),
    Error,
    "The API key is invalid.",
  );
});
