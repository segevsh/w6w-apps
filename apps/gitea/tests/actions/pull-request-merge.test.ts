import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-merge.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("pull-request-merge: POSTs the strategy as Gitea's `do`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], conn);
  const result = await action.execute!({ repo: "web", pullNumber: 4, strategy: "squash" }, ctx);
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/pulls/4/merge");
  assertEquals(JSON.parse(calls[0].body!).do, "squash");
  assertEquals(result, { pullNumber: 4, merged: true });
});

Deno.test("pull-request-merge: defaults to a merge commit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], conn);
  await action.execute!({ repo: "web", pullNumber: 4 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).do, "merge");
});

/** Force merge goes past the rules that exist to stop exactly this. */
Deno.test("pull-request-merge: forcing is off by default and logs at warn", async () => {
  const normal = mockCtx([{ status: 200 }], conn);
  await action.execute!({ repo: "web", pullNumber: 4 }, normal.ctx);
  assertEquals(JSON.parse(normal.calls[0].body!).force_merge, undefined);
  assertEquals(normal.logs[0].level, "info");

  const forced = mockCtx([{ status: 200 }], conn);
  await action.execute!({ repo: "web", pullNumber: 4, forceMerge: true }, forced.ctx);
  assertEquals(JSON.parse(forced.calls[0].body!).force_merge, true);
  assertEquals(forced.logs[0].level, "warn");
});

/** Queueing is not merging — the response says nothing about the outcome. */
Deno.test("pull-request-merge: waiting for checks is queued, and the output says so", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], conn);
  await action.execute!({ repo: "web", pullNumber: 4, mergeWhenChecksSucceed: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).merge_when_checks_succeed, true);
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "merged")!.label.includes("queued rather than merged"));
});

Deno.test("pull-request-merge: a missing PR number fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web" }, ctx),
    Error,
    "`pullNumber`",
  );
  assertEquals(calls.length, 0);
});
