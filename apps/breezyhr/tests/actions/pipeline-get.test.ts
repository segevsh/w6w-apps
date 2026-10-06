import { assertEquals } from "@std/assert";
import action from "../../actions/pipeline-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("pipeline-get: GETs the pipeline and encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "p1", pipeline: [{ id: "applied" }] } }]);
  const out = await action.execute!({ companyId: "c1", pipelineId: "default_pool" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/pipeline/default_pool");
  assertEquals(out, { _id: "p1", pipeline: [{ id: "applied" }] });
});

Deno.test("pipeline-get: a path-breaking id is percent-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ companyId: "c1", pipelineId: "a/b" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/pipeline/a%2Fb");
});
