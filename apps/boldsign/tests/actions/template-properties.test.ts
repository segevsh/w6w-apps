import { assertEquals } from "@std/assert";
import templateProperties from "../../actions/template-properties.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-properties: reads templateId as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { templateId: "tpl-1", roles: [] } }]);
  const out = await templateProperties.execute({ templateId: "tpl-1" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/template/properties");
  assertEquals(queryOf(calls[0]).get("templateId"), "tpl-1");
  assertEquals(out, { templateId: "tpl-1", roles: [] });
});
