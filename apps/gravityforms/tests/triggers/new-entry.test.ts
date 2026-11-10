import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-entry.ts";

test("new-entry seeds, emits, retries, and requests created-time descending", async () => {
  const seed = mockCtx([{ body: { entries: [{ id: 1 }] } }], { display: DISPLAY });
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://example.com/wp-json/gf/v2/entries?sorting%5Bkey%5D=date_created&sorting%5Bdirection%5D=DESC&paging%5Bpage_size%5D=100",
  );
});
