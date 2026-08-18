import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/account-unfollow.ts";

Deno.test("account-unfollow: unfollows and reports what changed", async () => {
  const { ctx, calls } = mockCtx([ok({ following: false, requested: false })], { display });
  const result = await action.execute!({ id: "a1" }, ctx) as {
    following: boolean;
    changed: boolean;
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/accounts/a1/unfollow");
  assertEquals(result.following, false);
  assertEquals(result.changed, true);
});

/** It is also the only way to withdraw a pending request. */
Deno.test("account-unfollow: a still-pending request means nothing was undone", async () => {
  const { ctx } = mockCtx([ok({ following: false, requested: true })], { display });
  const result = await action.execute!({ id: "a1" }, ctx) as {
    requested: boolean;
    changed: boolean;
  };
  assertEquals(result.requested, true);
  assertEquals(result.changed, false);
});

Deno.test("account-unfollow: needs an account id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
  assertEquals(calls.length, 0);
});

Deno.test("account-unfollow: logs the id only", async () => {
  const { ctx, logs } = mockCtx([ok({ following: false })], { display });
  await action.execute!({ id: "a1" }, ctx);
  assertEquals(logs[0].data, { id: "a1" });
});

Deno.test("account-unfollow: says it withdraws a request and does not notify", () => {
  assert(/withdraw a pending request/.test(action.description!), action.description);
  assert(/does not block, mute or notify/.test(action.description!), action.description);
});
