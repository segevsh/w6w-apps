import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-state-set.ts";

const display = { display: { region: "us" } };

/** The two transitions JumpCloud gives dedicated endpoints for. */
Deno.test("user-state-set: suspend and activate hit their own endpoints", async () => {
  const suspend = mockCtx([{ status: 200 }], display);
  await action.execute!({ userId: "u1", state: "suspend" }, suspend.ctx);
  assertEquals(new URL(suspend.calls[0].url).pathname, "/api/systemusers/u1/state/suspend");
  assertEquals(suspend.calls[0].method, "POST");

  const activate = mockCtx([{ status: 200 }], display);
  await action.execute!({ userId: "u1", state: "activate" }, activate.ctx);
  assertEquals(new URL(activate.calls[0].url).pathname, "/api/systemusers/u1/state/activate");
});

Deno.test("user-state-set: defaults to suspend, the offboarding direction", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], display);
  const result = await action.execute!({ userId: "u1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers/u1/state/suspend");
  assertEquals(result, { userId: "u1", state: "suspend" });
});

/** STAGED is a creation state, not a transition with an endpoint. */
Deno.test("user-state-set: offers only the two states that have endpoints", async () => {
  const options = (action.params as Array<{ key: string; options?: unknown }>)
    .find((p) => p.key === "state")!.options as Array<{ value: string }>;
  assertEquals(options.map((o) => o.value), ["suspend", "activate"]);

  const { ctx, calls } = mockCtx([], display);
  await assertRejects(
    async () => await action.execute!({ userId: "u1", state: "STAGED" }, ctx),
    Error,
    "`state` must be",
  );
  assertEquals(calls.length, 0);
});

Deno.test("user-state-set: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`userId`");
  assertEquals(calls.length, 0);
  assert(action.description!.includes("without deleting"), action.description);
});
