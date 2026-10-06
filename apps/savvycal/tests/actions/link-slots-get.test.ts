import { assertEquals } from "@std/assert";
import linkSlotsGet from "../../actions/link-slots-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("link-slots-get: wraps the bare-array response under `slots`", async () => {
  const slot = {
    start_at: "2026-10-20T14:00:00Z",
    end_at: "2026-10-20T14:30:00Z",
    duration: 30,
    rank: 1,
  };
  const { ctx, calls } = mockCtx([{ body: [slot] }]);
  const out = await linkSlotsGet.execute(
    { linkId: "link_1", from: "2026-10-20", until: "2026-10-21" },
    ctx,
  ) as { slots: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/links/link_1/slots");
  assertEquals(queryOf(calls[0].url), { from: "2026-10-20", until: "2026-10-21" });
  assertEquals(out.slots, [slot]);
});

Deno.test("link-slots-get: a non-array body yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await linkSlotsGet.execute({ linkId: "l" }, ctx) as { slots: unknown[] };
  assertEquals(out.slots, []);
});
