import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/issue-get.ts";

Deno.test("issue-get: fetches one issue by id", async () => {
  const { ctx, calls } = mockCtx([one({ id: "i1", readableIssueId: "VNT-42" })], { display });
  const result = await action.execute!({ issueId: "i1" }, ctx) as { readableIssueId: string };
  assertEquals(calls[0].url, "https://api.vanta.com/v1/issues/i1");
  assertEquals(result.readableIssueId, "VNT-42");
});

Deno.test("issue-get: needs an issue id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "issueId");
  assertEquals(calls.length, 0);
});

/** A ticket naming the requirement it threatens gets prioritised differently. */
Deno.test("issue-get: says what survives the round trip into a ticket", () => {
  assert(/readable id a person quotes/.test(action.description!), action.description);
});
