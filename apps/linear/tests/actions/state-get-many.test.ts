import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/state-get-many.ts";

test("state-get-many: filters by team when a team id is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { workflowStates: { nodes: [] } } } }]);
  await action.execute({ teamId: "t1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, { team: { id: { eq: "t1" } } });
});

test("state-get-many: omits the filter when no team is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { workflowStates: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  assertEquals("filter" in JSON.parse(calls[0].body!).variables, false);
});

test("state-get-many: says states are per-team", () => {
  assert(action.description?.includes("per-team"));
});
