import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-post.ts";

const connection = { display: { siteUrl: "https://example.com" } };
const input = { params: {}, subscriptionId: "sub_1" };

test("new-post seeds, emits unseen posts idempotently, and uses the newest-first posts request", async () => {
  const seedCtx = mockCtx([{ body: { posts: [{ id: "old" }] } }], connection);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seedCtx.calls[0].url,
    "https://example.com/ghost/api/admin/posts/?order=published_at+desc&limit=100&page=1",
  );

  const response = { body: { posts: [{ id: "new" }, { id: "old" }] } };
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
