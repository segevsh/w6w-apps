import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/transformation-run.ts";

Deno.test("transformation-run: posts and reports queued", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "t1" })]);
  const result = await action.execute!({ transformationId: "t1" }, ctx) as {
    queued: boolean;
    fullRefresh: boolean;
  };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/transformations/t1/run");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { full_refresh: false });
  assertEquals(result.queued, true);
  assertEquals(result.fullRefresh, false);
});

/** A full refresh drops and rebuilds incremental models. */
Deno.test("transformation-run: a full refresh is sent and warned about", async () => {
  const { ctx, calls, logs } = mockCtx([ok({ id: "t1" })]);
  await action.execute!({ transformationId: "t1", fullRefresh: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { full_refresh: true });
  assert(
    logs.some((l) => l.level === "warn" && /FULL REFRESH/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("transformation-run: needs a transformation id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "transformationId");
  assertEquals(calls.length, 0);
});

/** Running before the sync finishes transforms yesterday's data. */
Deno.test("transformation-run: names the ordering trap", () => {
  assert(/yesterday's data/.test(action.description!), action.description);
});
