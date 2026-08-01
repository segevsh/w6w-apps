import { assertEquals } from "@std/assert";
import { mockFreshdeskCtx } from "../_helpers.ts";
import action from "../../actions/company-get.ts";

Deno.test("company-get: GETs /companies/:id", async () => {
  const { ctx, calls } = mockFreshdeskCtx([{ body: { id: 6, name: "Acme Inc." } }]);
  const out = await action.execute({ companyId: 6 }, ctx);
  assertEquals(calls[0].url, "https://acme.freshdesk.com/api/v2/companies/6");
  assertEquals(out, { id: 6, name: "Acme Inc." });
});
