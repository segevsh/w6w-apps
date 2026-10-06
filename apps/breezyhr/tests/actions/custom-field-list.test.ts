import { assertEquals } from "@std/assert";
import action from "../../actions/custom-field-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("custom-field-list: GETs definitions for the chosen type", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "f1", name: "Visa" }] }]);
  const out = await action.execute!({ companyId: "c1", type: "position" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/custom-fields/position");
  assertEquals(out, { customFields: [{ _id: "f1", name: "Visa" }] });
});
