import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: fetches a single company by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "COM1", name: "Widget Shop" } }]);
  const out = await companyGet.execute({ accountId: "ACC1", companyId: "COM1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/companies/COM1.json");
  assertEquals(out, { id: "COM1", name: "Widget Shop" });
});
