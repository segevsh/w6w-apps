import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-result-list.ts";

Deno.test("check-result-list: reads one check's history", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "r1" }] }]);
  assertEquals(await action.execute!({ checkId: "c1" }, ctx), [{ id: "r1" }]);
  assertEquals(new URL(calls[0].url).pathname, "/v1/check-results/c1");
});

/** Without the filter a busy check buries its failures. */
Deno.test("check-result-list: the failure and result-type filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ checkId: "c1", hasFailures: true, resultType: "FINAL" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("hasFailures"), "true");
  assertEquals(q.get("resultType"), "FINAL");
});

Deno.test("check-result-list: hasFailures is omitted when off, not sent false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ checkId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("hasFailures"), null);
});

/** Counting every row as an incident overcounts by the retry strategy. */
Deno.test("check-result-list: the result-type hint explains the retry overcount", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "resultType")!;
  assert(param.hint!.includes("overcounts"), param.hint);
});

Deno.test("check-result-list: a blank check id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`checkId`");
  assertEquals(calls.length, 0);
});
