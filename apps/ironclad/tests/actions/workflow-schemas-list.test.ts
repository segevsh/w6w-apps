import { assertEquals } from "@std/assert";
import workflowSchemasList from "../../actions/workflow-schemas-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workflow-schemas-list: GET /workflow-schemas always sends form=launch", async () => {
  const { ctx, calls } = mockCtx([{ body: { list: [{ id: "t1", name: "NDA" }] } }]);
  const out = await workflowSchemasList.execute({}, ctx) as { list: unknown[] };
  assertEquals(pathOf(calls[0].url), "/public/api/v1/workflow-schemas");
  assertEquals(queryOf(calls[0].url), { form: "launch" });
  assertEquals(out.list.length, 1);
});
