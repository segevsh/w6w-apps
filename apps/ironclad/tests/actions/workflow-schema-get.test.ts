import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import workflowSchemaGet from "../../actions/workflow-schema-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("workflow-schema-get: GET /workflow-schemas/{id}?form=launch", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", schema: {} } }]);
  await workflowSchemaGet.execute({ schemaId: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflow-schemas/t1");
  assertEquals(queryOf(calls[0].url), { form: "launch" });
});
