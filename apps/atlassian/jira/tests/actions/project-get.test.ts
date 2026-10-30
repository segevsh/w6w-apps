import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

test("project-get: GETs /project/{key}", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { key: "ENG" } }]);
  await action.execute({ projectKey: "ENG" }, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/project/ENG");
});
