import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/account-follow.ts";

Deno.test("account-follow: follows and reports the relationship", async () => {
  const { ctx, calls } = mockCtx([ok({ following: true, requested: false })], { display });
  const result = await action.execute!({ id: "a1" }, ctx) as {
    following: boolean;
    requested: boolean;
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/accounts/a1/follow");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.following, true);
  assertEquals(result.requested, false);
});

/**
 * A locked account turns a follow into a request, and `following` stays false —
 * a workflow reading only that would retry forever.
 */
Deno.test("account-follow: a pending request is reported, not mistaken for a failure", async () => {
  const { ctx, logs } = mockCtx([ok({ following: false, requested: true })], { display });
  const result = await action.execute!({ id: "a1" }, ctx) as {
    following: boolean;
    requested: boolean;
  };
  assertEquals(result.following, false);
  assertEquals(result.requested, true);
  assert(/awaiting approval/.test(logs[0].message), logs[0].message);
});

Deno.test("account-follow: the two options are only sent when they differ from the default", async () => {
  const plain = mockCtx([ok({ following: true })], { display });
  await action.execute!({ id: "a1" }, plain.ctx);
  assertEquals(JSON.parse(plain.calls[0].body!), {});

  const tuned = mockCtx([ok({ following: true })], { display });
  await action.execute!({ id: "a1", reblogs: false, notify: true }, tuned.ctx);
  assertEquals(JSON.parse(tuned.calls[0].body!), { reblogs: false, notify: true });
});

Deno.test("account-follow: needs an account id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
  assertEquals(calls.length, 0);
});

Deno.test("account-follow: is idempotent and explains the locked-account case", () => {
  assertEquals(action.idempotent, true);
  assert(/this is a REQUEST/.test(action.description!), action.description);
});
