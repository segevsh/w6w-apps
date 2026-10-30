import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/status-boost.ts";

/**
 * Mastodon returns the STATUS, not a separate record — so the id is the
 * status's both ways round, and "did this change anything" is answerable.
 */
test("status-boost: posts to the status's own path and reads the result back", async () => {
  const { ctx, calls } = mockCtx([ok({ reblogged: true, reblogs_count: 5 })], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as {
    active: boolean;
    count: number;
    changed: boolean;
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/statuses/s1/reblog");
  assertEquals(calls[0].method, "POST");
  assertEquals(result.active, true);
  assertEquals(result.count, 5);
  assertEquals(result.changed, true);
});

/** Doing it when it was already done leaves one, and says nothing changed. */
test("status-boost: a no-op is reported as unchanged", async () => {
  const { ctx } = mockCtx([ok({ reblogged: false, reblogs_count: 5 })], { display });
  const result = await action.execute!({ id: "s1" }, ctx) as { changed: boolean };
  assertEquals(result.changed, false);
});

test("status-boost: needs a status id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`id` is required");
  assertEquals(calls.length, 0);
});

test("status-boost: logs the id and whether anything changed", async () => {
  const { ctx, logs } = mockCtx([ok({ reblogged: true })], { display });
  await action.execute!({ id: "s1" }, ctx);
  assertEquals(logs[0].data, { id: "s1", changed: true });
});

/** No separate record means no like-versus-post confusion. */
test("status-boost: is idempotent, unlike a record-based network", () => {
  assertEquals(action.idempotent, true);
});
