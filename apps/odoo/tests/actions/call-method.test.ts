import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/call-method.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("call-method: is a perform that pins no resource and promises no idempotency", () => {
  assertEquals(action.key, "call-method");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, undefined);
  // The method is chosen at runtime — it could be search_read or unlink.
  assertEquals(action.idempotent, false);
});

Deno.test("call-method: passes model, method, args and kwargs straight through", async () => {
  const { ctx, calls } = mockCtx([{ result: true }]);
  const out = await action.execute({
    model: "account.move",
    method: "action_post",
    args: [[5]],
    kwargs: { context: { lang: "en_US" } },
  }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "account.move",
    method: "action_post",
    args: [[5]],
    kwargs: { context: { lang: "en_US" } },
  });
  assertEquals(out, { result: true });
});

Deno.test("call-method: defaults to empty args and kwargs", async () => {
  const { ctx, calls } = mockCtx([{ result: null }]);
  await action.execute({ model: "res.partner", method: "default_get" }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, []);
  assertEquals(executeKwArgs(calls[0]).kwargs, {});
});

Deno.test("call-method: accepts JSON strings for args and kwargs", async () => {
  const { ctx, calls } = mockCtx([{ result: 1 }]);
  await action.execute({
    model: "res.partner",
    method: "search_count",
    args: "[[]]",
    kwargs: '{"limit":1}',
  }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [[]]);
  assertEquals(executeKwArgs(calls[0]).kwargs, { limit: 1 });
});

Deno.test("call-method: rejects the wrong JSON shape before calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  // args must be an array, kwargs must be an object — swapping them is the
  // mistake this guards.
  await assertRejects(() =>
    action.execute({ model: "m", method: "x", args: '{"a":1}' }, ctx) as Promise<unknown>
  );
  await assertRejects(() =>
    action.execute({ model: "m", method: "x", kwargs: "[1,2]" }, ctx) as Promise<unknown>
  );
  await assertRejects(() =>
    action.execute({ model: "m", method: "x", args: "{oops" }, ctx) as Promise<unknown>
  );
  assertEquals(calls.length, 0);
});

Deno.test("call-method: states that it cannot widen the user's permissions", () => {
  assert(/permissions/i.test(description(action)));
});
