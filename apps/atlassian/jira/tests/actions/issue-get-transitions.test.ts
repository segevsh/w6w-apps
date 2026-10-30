import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-get-transitions.ts";

test("issue-get-transitions: GETs the transitions sub-resource", async () => {
  const { ctx, calls } = mockJiraCtx([{ body: { transitions: [] } }]);
  await action.execute({ issueKey: "ENG-1" }, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/api/3/issue/ENG-1/transitions");
});

test("issue-get-transitions: says the list depends on the current status", () => {
  assert(action.description?.includes("CURRENT status"));
});
