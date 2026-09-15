import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

Deno.test("invoice-list: GETs /invoices with a status filter", async () => {
  const { ctx, calls } = mockMocoCtx([{
    body: [{ id: 1, status: "sent" }],
    headers: {
      "content-type": "application/json",
      "x-page": "1",
      "x-per-page": "100",
      "x-total": "1",
    },
  }]);
  const out = await action.execute({ status: "sent,overdue" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/invoices");
  assertEquals(url.searchParams.get("status"), "sent,overdue");
  assertEquals(out, {
    invoices: [{ id: 1, status: "sent" }],
    page: 1,
    perPage: 100,
    total: 1,
  });
});
