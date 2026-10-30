import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/candidate-update.ts";

const ok = (results: unknown) => ({ status: 200, body: { success: true, results } });

test("candidate-update: sends only the fields it was given", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  await action.execute!({ candidateId: "c1", phoneNumber: "+49 30 1234" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    candidateId: "c1",
    phoneNumber: "+49 30 1234",
    sendNotifications: false,
  });
});

/** Unsetting a source is a real edit, and `null` must survive compaction. */
test("candidate-update: the literal null unsets a source", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  await action.execute!({ candidateId: "c1", sourceId: "null" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sourceId, null);
});

test("candidate-update: a real source id is sent as itself", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  await action.execute!({ candidateId: "c1", creditedToUserId: "user_9" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).creditedToUserId, "user_9");
});

/**
 * Ashby's own default is to notify. A bulk correction should not email
 * everyone watching a hundred candidates.
 */
test("candidate-update: notifications default to off, against Ashby's default", async () => {
  const { ctx, calls } = mockCtx([ok({ id: "c1" })]);
  await action.execute!({ candidateId: "c1", name: "Ada" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sendNotifications, false);
  const p = (action.params as Array<{ key: string; default?: unknown }>)
    .find((p) => p.key === "sendNotifications")!;
  assertEquals(p.default, false);
});

test("candidate-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ candidateId: "c1" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

test("candidate-update: needs a candidate id", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ name: "Ada" }, ctx),
    Error,
    "candidateId",
  );
});

/** Sending one social link removes the others. */
test("candidate-update: the social-links param says it REPLACES", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "socialLinks")!;
  assert(/REPLACES/.test(p.hint!), p.hint);
});
