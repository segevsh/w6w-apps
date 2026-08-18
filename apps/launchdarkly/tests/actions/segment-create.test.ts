import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/segment-create.ts";

const conn = { display: { projectKey: "default", environmentKey: "production" } };

Deno.test("segment-create: POSTs into one environment", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { key: "beta" } }], conn);
  await action.execute!({ key: "beta", name: "Beta users" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/segments/default/production");
  assertEquals(JSON.parse(calls[0].body!), { key: "beta", name: "Beta users" });
});

Deno.test("segment-create: the big-segment flag is only sent when set", async () => {
  const off = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ key: "k", name: "n" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).unbounded, undefined);

  const on = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ key: "k", name: "n", unbounded: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).unbounded, true);
});

Deno.test("segment-create: key and name are both required, before any request", async () => {
  const noKey = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ name: "n" }, noKey.ctx), Error, "`key`");
  const noName = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ key: "k" }, noName.ctx), Error, "`name`");
  assertEquals(noKey.calls.length + noName.calls.length, 0);
  assertEquals(action.idempotent, false);
  assert(action.description!.includes("does not exist in the others"), action.description);
});
