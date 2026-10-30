import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-update.ts";

const REPO = { owner: "acme", repository: "api", issueNumber: 4 };

test("issue-update: PATCHes only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ ...REPO, state: "closed", stateReason: "completed" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { state: "closed", state_reason: "completed" });
});

test("issue-update: the state reason only shows once the issue is being closed", () => {
  const reason = action.params?.find((p) => p.key === "stateReason");
  assertEquals(reason?.showIf, { field: "state", eq: "closed" });
});

test("issue-update: warns that labels/assignees replace rather than append", () => {
  assert(action.params?.find((p) => p.key === "labels")?.hint?.includes("REPLACES"));
  assert(action.params?.find((p) => p.key === "assignees")?.hint?.includes("REPLACES"));
});
