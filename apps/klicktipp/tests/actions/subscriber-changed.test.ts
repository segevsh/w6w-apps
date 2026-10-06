import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/subscriber-changed.ts";

Deno.test("subscriber-changed: sends from, limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriberIds: ["5"], nextCursor: null } }]);
  const out = await action.execute({ from: 1777593600, cursor: "x", limit: 50 }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.klicktipp.com/subscriber/changed?from=1777593600&cursor=x&limit=50",
  );
  assertEquals(out, { subscriberIds: ["5"], nextCursor: null });
});

Deno.test("subscriber-changed: from=0 is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriberIds: [], nextCursor: null } }]);
  await action.execute({ from: 0 }, ctx);
  assertEquals(calls[0].url, "https://api.klicktipp.com/subscriber/changed?from=0&limit=100");
});
