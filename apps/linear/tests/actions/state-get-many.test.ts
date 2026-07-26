import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/state-get-many.ts";

Deno.test("state-get-many: filters by team when a team id is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { workflowStates: { nodes: [] } } } }]);
  await action.execute({ teamId: "t1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, { team: { id: { eq: "t1" } } });
});

Deno.test("state-get-many: omits the filter when no team is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { workflowStates: { nodes: [] } } } }]);
  await action.execute({}, ctx);
  assertEquals("filter" in JSON.parse(calls[0].body!).variables, false);
});

Deno.test("state-get-many: says states are per-team", () => {
  assert(action.description?.includes("per-team"));
});
