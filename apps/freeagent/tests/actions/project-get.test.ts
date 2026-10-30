import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

test("project-get: GETs /projects/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { project: { url: "x" } } }]);
  await action.execute({ projectId: "3" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/projects/3");
});
