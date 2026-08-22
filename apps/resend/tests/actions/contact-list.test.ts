import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: makes one call and passes the segment filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object: "list", data: [] } }], {
    display: {},
  });
  await action.execute!({ segmentId: "seg_1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("segment_id"), "seg_1");
});
