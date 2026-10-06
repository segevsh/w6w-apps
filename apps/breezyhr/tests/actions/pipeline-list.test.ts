import { assertEquals } from "@std/assert";
import action from "../../actions/pipeline-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("pipeline-list: keeps the by-name object", async () => {
  const { ctx, calls } = mockCtx([{ body: { default: { pipeline: [] } } }]);
  const out = await action.execute!({ companyId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/pipelines");
  assertEquals(out, { pipelines: { default: { pipeline: [] } } });
});

Deno.test("pipeline-list: an array body is not mistaken for the map", async () => {
  const { ctx } = mockCtx([{ body: [1] }]);
  assertEquals(await action.execute!({ companyId: "c1" }, ctx), { pipelines: {} });
});
