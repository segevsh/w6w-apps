import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

const display = {};

/** Re-subscribing is `unsubscribed: false`, so false must survive `compact`. */
test("contact-update: false is sent, because re-subscribing is a real update", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c_1" } }], { display });
  await action.execute!({ contact: "a@b.com", unsubscribed: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { unsubscribed: false });
});

test("contact-update: refuses a no-op", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ contact: "a@b.com" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});
