import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import listSegmentColors from "../../actions/list-segment-colors.ts";

Deno.test("list-segment-colors: GET /v1/segments/colors, a bare array with no paging", async () => {
  const colors = ["#B7D4C7", "#E5D4C0", "#D9C5B2"];
  const { ctx, calls } = mockCtx([{ body: colors }]);
  const out = await listSegmentColors.execute({}, ctx);

  assertEquals(calls[0].url, "https://api.flodesk.com/v1/segments/colors");
  assertEquals(out, colors);
  // No pagination params exist on this endpoint, so the action must expose none.
  assertEquals(listSegmentColors.params, []);
  assertEquals(listSegmentColors.type, "read");
});
