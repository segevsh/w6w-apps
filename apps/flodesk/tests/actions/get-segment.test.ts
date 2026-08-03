import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import getSegment from "../../actions/get-segment.ts";

Deno.test("get-segment: GET /v1/segments/{id}", async () => {
  const body = {
    id: "61b2",
    name: "VIP",
    color: "#B7D4C7",
    total_active_subscribers: 42,
    created_at: "2023-01-02T15:04:05.999Z",
  };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await getSegment.execute({ segmentId: "61b2" }, ctx), body);
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/segments/61b2");
});
