import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import removeSubscriberFromSegments from "../../actions/remove-subscriber-from-segments.ts";

Deno.test("remove-subscriber-from-segments: DELETEs with a body, as documented", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "61b2" } }]);
  await removeSubscriberFromSegments.execute(
    { idOrEmail: "61b2", segmentIds: ["s1"] },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/subscribers/61b2/segments");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { segment_ids: ["s1"] });
});
