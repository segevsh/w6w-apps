import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/connection-sync.ts";

Deno.test("connection-sync: posts to the sync path and reports queued", async () => {
  const { ctx, calls } = mockCtx([ok({})]);
  const result = await action.execute!({ connectionId: "c1" }, ctx) as { queued: boolean };
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/connections/c1/sync");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(result.queued, true);
});

/** Without force, triggering a busy connection does nothing. */
Deno.test("connection-sync: force is sent only when asked for", async () => {
  const forced = mockCtx([ok({})]);
  await action.execute!({ connectionId: "c1", force: true }, forced.ctx);
  assertEquals(JSON.parse(forced.calls[0].body!), { force: true });

  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "force"
  )!;
  assert(/discarding its work/.test(p.hint!), p.hint);
});

Deno.test("connection-sync: needs a connection id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "connectionId");
  assertEquals(calls.length, 0);
});

Deno.test("connection-sync: logs the connection and whether it forced", async () => {
  const { ctx, logs } = mockCtx([ok({})]);
  await action.execute!({ connectionId: "c1" }, ctx);
  assertEquals(logs[0].data, { connectionId: "c1", force: false });
});

/** A successful trigger is not fresh data. */
Deno.test("connection-sync: says it returns when queued, not when loaded", () => {
  assert(/QUEUED/.test(action.description!), action.description);
});
