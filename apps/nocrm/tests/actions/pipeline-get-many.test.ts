import { assertEquals } from "@std/assert";
import { mockNocrmCtx } from "../_helpers.ts";
import action from "../../actions/pipeline-get-many.ts";

Deno.test("pipeline-get-many: GETs /pipelines with no parameters", async () => {
  const { ctx, calls } = mockNocrmCtx([{
    body: [{ id: 25, name: "Sales funnel", is_default: true }],
  }]);
  const page = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://acme.nocrm.io/api/v2/pipelines");
  assertEquals(page.items.length, 1);
  assertEquals(page.totalCount, undefined);
});
