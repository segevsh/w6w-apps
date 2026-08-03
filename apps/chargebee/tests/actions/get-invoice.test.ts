import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-invoice.ts";

const ok = { status: 200, body: { invoice: { id: "inv_1" } } };

Deno.test("get-invoice: is a read action over the invoice resource", () => {
  assertEquals(action.key, "get-invoice");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "invoice");
});

Deno.test("get-invoice: GETs /invoices/{id}", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute({ invoiceId: "inv_1" }, connected(ctx));
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/invoices/inv_1");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-invoice: paginates line items independently of the invoice", async () => {
  // The only retrieve endpoint in this app with query parameters, and they
  // matter — a large invoice otherwise returns truncated line items silently.
  const { ctx, calls } = mockCtx([ok]);
  await action.execute(
    { invoiceId: "inv_1", lineItemsLimit: 100, lineItemsOffset: "cur" },
    connected(ctx),
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("line_items_limit"), "100");
  assertEquals(q.get("line_items_offset"), "cur");
});

Deno.test("get-invoice: returns just the invoice — no customer is bundled here", async () => {
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), ["invoice"]);
  const { ctx } = mockCtx([ok]);
  assertEquals(await action.execute({ invoiceId: "inv_1" }, connected(ctx)), ok.body);
});
