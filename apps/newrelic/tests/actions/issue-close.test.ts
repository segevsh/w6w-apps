import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/issue-close.ts";

Deno.test("issue-close: sends the account and issue id", async () => {
  const { ctx, calls } = mockCtx([
    ok({ aiIssuesResolveIssue: { result: { issueId: "a" } } }),
  ], { display });
  const result = await action.execute!({ issueId: "a" }, ctx) as { closed: boolean };
  assertEquals(JSON.parse(calls[0].body!).variables, { accountId: 12345, issueId: "a" });
  assertEquals(result.closed, true);
});

Deno.test("issue-close: a payload error throws", async () => {
  const { ctx } = mockCtx([
    ok({ aiIssuesResolveIssue: { error: { message: "already closed" } } }),
  ], { display });
  await assertRejects(
    async () => await action.execute!({ issueId: "a" }, ctx),
    Error,
    "already closed",
  );
});

Deno.test("issue-close: needs an issue id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`issueId` is required");
});

/**
 * Closing something still breaching just opens a new issue, which looks like an
 * alerting fault rather than the unfixed problem it is.
 */
Deno.test("issue-close: says New Relic will reopen it if still breaching", () => {
  assert(/opens a new issue on the next incident/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
