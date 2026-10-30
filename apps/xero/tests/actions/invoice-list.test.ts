import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/invoice-list.ts";

test("invoice-list: GETs /Invoices and forwards Statuses", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Invoices: [] } }]);
  await action.execute({ statuses: "DRAFT,AUTHORISED" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api.xro/2.0/Invoices");
  assertEquals(url.searchParams.get("Statuses"), "DRAFT,AUTHORISED");
  assertEquals(url.searchParams.get("page"), "1");
});
