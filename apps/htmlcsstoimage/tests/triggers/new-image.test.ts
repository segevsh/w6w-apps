import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-image.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const image = (id: string) => ({ id, created_at: "2026-11-09T00:00:00Z" });
const page = (images: unknown[]) => ({ images, next_page_token: null, has_next_page: false });

test("new-image seeds, emits a new image, retries idempotently, and requests the literal newest page", async () => {
  const seedCtx = mockCtx([{ body: page([image("a")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "GET");
  assertEquals(seedCtx.calls[0].url, "https://hcti.io/v1/images?count=50");

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([image("b"), image("a")]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([image("b"), image("a")]) }]).ctx,
  );
  assertEquals(first.events, [image("b")]);
  assertEquals(retry, first);
});
