import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/broadcast-create.ts";

const display = {};

test("broadcast-create: sends the segment Resend requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "b_1" } }], { display });
  await action.execute!({
    segmentId: "seg_1",
    from: "Acme <news@example.com>",
    subject: "March update",
    html: "<p>hi</p>",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    segment_id: "seg_1",
    from: "Acme <news@example.com>",
    subject: "March update",
    html: "<p>hi</p>",
  });
});

test("broadcast-create: from, subject and segment are all required", async () => {
  for (
    const [patch, needle] of [
      [{ from: "a@b.com", subject: "s", html: "h" }, "`segmentId`"],
      [{ segmentId: "s1", subject: "s", html: "h" }, "`from`"],
      [{ segmentId: "s1", from: "a@b.com", html: "h" }, "`subject`"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(patch, ctx), Error, needle);
    assertEquals(calls.length, 0);
  }
});

test("broadcast-create: a broadcast with no body is caught before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ segmentId: "s1", from: "a@b.com", subject: "s" }, ctx),
    Error,
    "needs a body",
  );
  assertEquals(calls.length, 0);
});
