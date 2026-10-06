import { assertEquals } from "@std/assert";
import action from "../../actions/department-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("department-list: GETs departments", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "d1", name: "Eng" }] }]);
  const out = await action.execute!({ companyId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/departments");
  assertEquals(out, { departments: [{ id: "d1", name: "Eng" }] });
});
