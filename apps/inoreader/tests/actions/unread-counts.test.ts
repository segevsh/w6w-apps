import { assertEquals } from "@std/assert";
import unread from "../../actions/unread-counts.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("unread-counts: returns counters and extracts the reading-list total", async () => {
  const body = {
    max: 1000,
    unreadcounts: [
      { id: "user/1005921515/state/com.google/reading-list", count: 4 },
      { id: "user/1005921515/label/Animation", count: 0 },
    ],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await unread.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/reader/api/0/unread-count");
  assertEquals(out, { max: 1000, unreadcounts: body.unreadcounts, total: 4 });
});

Deno.test("unread-counts: total is undefined when there is no reading-list counter", async () => {
  const { ctx } = mockCtx([{ body: { max: 100 } }]);
  assertEquals(await unread.execute({}, ctx), { max: 100, unreadcounts: [], total: undefined });
});
