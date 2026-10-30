import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import projectCollaboratorList from "../../actions/project-collaborator-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("project-collaborator-list: lists the outside companies on a project", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ id: "1", company_id: "8", project_invitation_id: "3" }],
  }]);
  const page = await projectCollaboratorList.execute({ projectId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/projects/1/collaborators");
  assertEquals(page.count, 1);
});
