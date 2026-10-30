import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-update.ts";

test("issue-update: PUTs only the supplied fields", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1", summary: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { fields: { summary: "Renamed" } });
});

test("issue-update: refuses an empty update rather than sending a no-op", () => {
  const { ctx, calls } = mockJiraCtx();
  assertThrows(() => action.execute({ issueKey: "ENG-1" }, ctx), Error, "Nothing to update");
  assertEquals(calls.length, 0);
});

test("issue-update: points at issue-transition for status changes", () => {
  // Status is not a writable field in Jira, so the description has to say so.
  assertEquals(action.description?.includes("issue-transition"), true);
});
