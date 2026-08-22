import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-unlock.ts";

const display = { display: { region: "us" } };

Deno.test("user-unlock: POSTs the unlock endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], display);
  const result = await action.execute!({ userId: "u1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/systemusers/u1/unlock");
  assertEquals(result, { userId: "u1", unlocked: true });
});

/** A lockout and a suspension are different states with different fixes. */
Deno.test("user-unlock: says plainly that it does not lift a suspension", () => {
  assert(action.description!.includes("Does not lift a suspension"), action.description);
});

Deno.test("user-unlock: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], display);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`userId`");
  assertEquals(calls.length, 0);
});
