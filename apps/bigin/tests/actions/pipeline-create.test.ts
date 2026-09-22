import { assertEquals, assertRejects } from "@std/assert";
import { mockBiginCtx, recordResult } from "../_helpers.ts";
import action from "../../actions/pipeline-create.ts";

Deno.test("pipeline-create: POSTs the record wrapped in `data`, the shape Bigin's own sample shows", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: recordResult("2034020000000489022") }]);
  const result = await action.execute({
    fields: {
      Deal_Name: "Renewal",
      Sub_Pipeline: "Sales Pipeline Standard",
      Stage: "Qualification",
    },
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/bigin/v2/Pipelines");
  assertEquals(JSON.parse(calls[0].body ?? ""), {
    data: [{
      Deal_Name: "Renewal",
      Sub_Pipeline: "Sales Pipeline Standard",
      Stage: "Qualification",
    }],
  });
  assertEquals(result.details?.id, "2034020000000489022");
});

Deno.test("pipeline-create: surfaces a per-record error even on a 2xx response", async () => {
  const { ctx } = mockBiginCtx([{
    body: {
      data: [{ code: "MANDATORY_NOT_FOUND", message: "required field not found", status: "error" }],
    },
  }]);
  await assertRejects(
    async () => {
      await action.execute({
        fields: {
          Deal_Name: "Renewal",
          Sub_Pipeline: "Sales Pipeline Standard",
          Stage: "Qualification",
        },
      }, ctx);
    },
    Error,
    "MANDATORY_NOT_FOUND",
  );
});
