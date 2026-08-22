import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-run.ts";

Deno.test("check-run: POSTs a target built from the named checks", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "s1" } }]);
  const result = await action.execute!({ checkIds: "c1, c2" }, ctx) as { queued: boolean };
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/check-sessions/trigger");
  assertEquals(JSON.parse(calls[0].body!), { target: { checkIds: ["c1", "c2"] } });
  assertEquals(result.queued, true);
});

/** Checkly's tag filter is an array of arrays: OR of ANDs. */
Deno.test("check-run: tags are wrapped in the array-of-arrays Checkly expects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ tags: "production, api" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).target, { tags: [["production", "api"]] });
});

/**
 * "If no filters are given, matches all eligible checks" — hundreds of billed
 * runs on a large account.
 */
Deno.test("check-run: refuses a call with no target at all", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "no target");
  assertEquals(calls.length, 0);
});

Deno.test("check-run: running everything is possible, but explicit and logged at warn", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ runEverything: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { target: {} });
  assertEquals(logs[0].level, "warn");
});

Deno.test("check-run: naming checks AND asking for everything is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ checkIds: "c1", runEverything: true }, ctx),
    Error,
    "pick one target",
  );
  assertEquals(calls.length, 0);
});

Deno.test("check-run: an advanced target passes through as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ target: '{"checkIds":["c9"]}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).target, { checkIds: ["c9"] });
});

/** A session is not a verdict. */
Deno.test("check-run: the output does not claim anything passed", () => {
  const outputs = action.output as Array<{ key: string; label: string }>;
  assert(outputs.find((o) => o.key === "queued")!.label.includes("NOT a statement"));
  assertEquals(action.idempotent, false);
});
