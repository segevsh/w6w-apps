import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/pull-request-get.ts";

const pr = (votes: number[]) =>
  one({
    pullRequestId: 42,
    title: "Fix login",
    status: "active",
    mergeStatus: "succeeded",
    reviewers: votes.map((vote) => ({ vote })),
  });

/** Votes are an enum wearing a number's clothes: -10 is a rejection. */
Deno.test("pull-request-get: counts the votes rather than summing them", async () => {
  const { ctx, calls } = mockCtx([pr([10, 10, -10, 0])], { display });
  const result = await action.execute!({ project: "P", pullRequestId: "42" }, ctx) as {
    voteCounts: Record<string, number>;
    rejected: boolean;
  };
  // The project-level path — no repository needed.
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/git/pullrequests/42",
  );
  assertEquals(result.voteCounts, { approved: 2, rejected: 1, noVote: 1 });
  assertEquals(result.rejected, true);
});

Deno.test("pull-request-get: approval with suggestions is its own outcome", async () => {
  const { ctx } = mockCtx([pr([5])], { display });
  const result = await action.execute!({ project: "P", pullRequestId: "42" }, ctx) as {
    voteCounts: Record<string, number>;
    rejected: boolean;
  };
  assertEquals(result.voteCounts, { approvedWithSuggestions: 1 });
  assertEquals(result.rejected, false);
});

Deno.test("pull-request-get: a pull request with no reviewers counts nothing", async () => {
  const { ctx } = mockCtx([pr([])], { display });
  const result = await action.execute!({ project: "P", pullRequestId: "42" }, ctx) as {
    voteCounts: Record<string, number>;
  };
  assertEquals(result.voteCounts, {});
});

Deno.test("pull-request-get: needs a project and a pull request id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P" }, ctx),
    Error,
    "pullRequestId",
  );
  assertEquals(calls.length, 0);
});

/** Approved and unmergeable are different fields that never mention each other. */
Deno.test("pull-request-get: separates mergeability from approval", () => {
  assert(/separate from approval/.test(
    (action.output as Array<{ key: string; label: string }>)
      .find((o) => o.key === "mergeStatus")!.label,
  ));
});
