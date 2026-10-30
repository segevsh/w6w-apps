import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectPersonList from "../../actions/project-person-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("project-person-list: GET /projects/:project_id/persons", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 8, firstname: "Jane" }] }]);
  const out = await projectPersonList.execute({ projectId: 42 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/projects/42/persons");
  assertEquals(out, [{ id: 8, firstname: "Jane" }]);
});
