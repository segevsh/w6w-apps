import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-comment.ts";

const input = { params: { appId: "1", recordId: "1" }, subscriptionId: "sub_1" };
const connection = { display: { baseUrl: "https://acme.cybozu.com" } };

test("new-comment seeds, emits unseen comments idempotently, and requests newest-first comments", async () => {
  const seedCtx = mockCtx([{ body: { comments: [{ id: "old" }] } }], connection);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://acme.cybozu.com/k/v1/record/comments.json?app=1&record=1&order=desc&offset=0&limit=10",
  );
  const response = { body: { comments: [{ id: "new" }, { id: "old" }] } };
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response], connection).ctx,
  );
  const second = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response], connection).ctx,
  );
  assertEquals(first.events, [{ id: "new" }]);
  assertEquals(first, second);
});
