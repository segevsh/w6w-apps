import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import addSubscriberToSegments from "../../actions/add-subscriber-to-segments.ts";
import removeSubscriberFromSegments from "../../actions/remove-subscriber-from-segments.ts";

Deno.test("add-subscriber-to-segments: POSTs segment_ids to the subscriber's segments", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "61b2" } }]);
  await addSubscriberToSegments.execute(
    { idOrEmail: "ada@example.com", segmentIds: ["s1", "s2"] },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.flodesk.com/v1/subscribers/ada%40example.com/segments",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { segment_ids: ["s1", "s2"] });
});

Deno.test("segment membership writes reject an empty id list without calling", () => {
  for (const action of [addSubscriberToSegments, removeSubscriberFromSegments]) {
    const { ctx, calls } = mockCtx([]);
    assertThrows(() => action.execute({ idOrEmail: "x", segmentIds: [] }, ctx), Error);
    assertEquals(calls.length, 0, `${action.key}: should not have called`);
  }
});

Deno.test("segment membership writes are idempotent — membership is a set", () => {
  assertEquals(addSubscriberToSegments.idempotent, true);
  assertEquals(removeSubscriberFromSegments.idempotent, true);
});

// ----------------------------------------------------- unsubscribe ----------
