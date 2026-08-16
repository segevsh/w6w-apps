import { assertEquals } from "@std/assert";
import audienceSegmentDelete from "../../actions/audience-segment-delete.ts";
import { mockCtx, noContentResponse, pathOf } from "../_helpers.ts";

Deno.test("audience-segment-delete: DELETEs by numeric segment id", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await audienceSegmentDelete.execute({ segmentId: "10000" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/rest/dmpSegments/10000");
  assertEquals(result, { ok: true });
});

Deno.test("audience-segment-delete: is not marked idempotent — a repeat delete 404s rather than no-ops", () => {
  assertEquals(audienceSegmentDelete.idempotent, false);
});
