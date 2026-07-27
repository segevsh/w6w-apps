import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/company-create-or-update.ts";

Deno.test("company-create-or-update: POSTs /companies keyed on company_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", company_id: "acme" } }]);
  await action.execute!({ companyId: "acme", name: "Acme", size: 100 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/companies");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { company_id: "acme", name: "Acme", size: 100 });
});
