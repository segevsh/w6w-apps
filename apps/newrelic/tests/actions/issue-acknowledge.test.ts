import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/issue-acknowledge.ts";

test("issue-acknowledge: sends the account and issue id", async () => {
  const { ctx, calls } = mockCtx([
    ok({ aiIssuesAckIssue: { result: { issueId: "a", acknowledgedBy: "Ada" } } }),
  ], { display });
  const result = await action.execute!({ issueId: "a" }, ctx) as { acknowledged: boolean };
  assertEquals(JSON.parse(calls[0].body!).variables, { accountId: 12345, issueId: "a" });
  assertEquals(result.acknowledged, true);
});

/**
 * This mutation reports a single `error`, not an `errors` list — the shape
 * varies across NerdGraph, and it still arrives inside a 200.
 */
test("issue-acknowledge: a payload error throws, and names the 200", async () => {
  const { ctx } = mockCtx([
    ok({ aiIssuesAckIssue: { error: { message: "issue not found", type: "NOT_FOUND" } } }),
  ], { display });
  const error = await assertRejects(
    async () => await action.execute!({ issueId: "gone" }, ctx),
    Error,
  );
  assert(/NOT_FOUND: issue not found/.test(error.message), error.message);
  assert(/HTTP 200 with no GraphQL errors/.test(error.message), error.message);
});

test("issue-acknowledge: needs an issue id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`issueId` is required");
  assertEquals(calls.length, 0);
});

test("issue-acknowledge: logs the issue id", async () => {
  const { ctx, logs } = mockCtx([ok({ aiIssuesAckIssue: { result: {} } })], { display });
  await action.execute!({ issueId: "a" }, ctx);
  assertEquals(logs[0].data, { issueId: "a" });
});

/** Acknowledging is not closing and does not silence anything. */
test("issue-acknowledge: says what it does not do", () => {
  assert(/does not stop the condition evaluating/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
