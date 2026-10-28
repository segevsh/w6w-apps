import { assertEquals } from "@std/assert";
import audienceSegmentGet from "../../actions/audience-segment-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("audience-segment-get: fetches by numeric segment id", async () => {
  const body = { id: 11204, name: "Test DMP Segment 2", type: "USER" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await audienceSegmentGet.execute({ segmentId: "11204" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/dmpSegments/11204");
  assertEquals(result, body);
});
