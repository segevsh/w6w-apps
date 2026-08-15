import { assertEquals } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-list: hits companies.json and forwards status + search", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("companies", [{ id: "COM1" }]) }]);
  const out = await companyList.execute(
    { accountId: "ACC1", status: "active", search: "Widget" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/companies.json");
  const q = queryOf(calls[0].url);
  assertEquals(q.status, "active");
  assertEquals(q.search, "Widget");
  assertEquals(out.companies, [{ id: "COM1" }]);
});
