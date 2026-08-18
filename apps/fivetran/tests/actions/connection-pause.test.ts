import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { ok } from "./_shared.ts";
import action from "../../actions/connection-pause.ts";

Deno.test("connection-pause: PATCHes the paused flag", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1", paused: true })]);
  await action.execute!({ connectionId: "c1", paused: true }, ctx);
  assertEquals(calls[0].url, "https://api.fivetran.com/v1/connections/c1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { paused: true });
});

Deno.test("connection-pause: resuming sends a real false", async () => {
  const { ctx, calls, logs } = mockCtx([ok({ id: "c1", paused: false })]);
  await action.execute!({ connectionId: "c1", paused: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { paused: false });
  assert(/resumed/.test(logs[0].message), logs[0].message);
});

/** A bare call should pause rather than silently resume. */
Deno.test("connection-pause: defaults to pausing", async () => {
  const { ctx, calls } = mockCtx([ok({})]);
  await action.execute!({ connectionId: "c1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { paused: true });
});

Deno.test("connection-pause: needs a connection id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "connectionId");
  assertEquals(calls.length, 0);
});

/** Resuming catches up everything at once. */
Deno.test("connection-pause: warns what resuming actually does", () => {
  assert(/catches up/.test(action.description!), action.description);
});
