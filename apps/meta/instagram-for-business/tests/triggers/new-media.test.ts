import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-media.ts";

const item = (id: string) => ({ id });
const ctx = (items: unknown[]) => mockCtx([{ body: { data: items } }]);

test("new-media seeds, emits new media, retries, and requests the media edge", async () => {
  const seed = ctx([item("a")]);
  const input = { params: { igUserId: "17" }, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://graph.facebook.com/v23.0/17/media?fields=id%2Ccaption%2Cmedia_type%2Cmedia_product_type%2Cmedia_url%2Cpermalink%2Cthumbnail_url%2Ctimestamp%2Clike_count%2Ccomments_count&limit=100",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
