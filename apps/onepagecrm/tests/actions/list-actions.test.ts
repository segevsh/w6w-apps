import { assertEquals } from "@std/assert";
import listActions from "../../actions/list-actions.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-actions: GET /actions with done and assignee filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("actions", [{ action: { id: "a1" } }]) }]);
  const out = await listActions.execute(
    { done: false, assigneeId: "u1", contactId: "c1" },
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/api/v3/actions");
  assertEquals(queryOf(calls[0].url), { done: "false", assignee_id: "u1", contact_id: "c1" });
  assertEquals(out.items, [{ action: { id: "a1" } }]);
  assertEquals(out.totalCount, 1);
});
