import { assert, assertEquals } from "@std/assert";
import action from "../../actions/issue-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-update: PATCHes only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "i1", state: "closed" } } }]);
  const out = await action.execute!({ id: "i1", state: "closed", teamId: "t1" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/i1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { state: "closed", team_id: "t1" });
  assertEquals(out, { id: "i1", state: "closed" });
});

Deno.test("issue-update: an empty string is sent so the assignee can be cleared", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "i1", assigneeId: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { assignee_id: "" });
});

Deno.test("issue-update: an empty tag list clears tags; the deprecated requestor_id is not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "i1", tags: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { tags: [] });
  assert(!action.params!.some((p) => /requestor/i.test(p.key)));
});
