import { assertEquals } from "@std/assert";
import remove from "../../actions/competitor-remove.ts";
import { envelope, mockCtx } from "../_helpers.ts";

Deno.test("competitor-remove: DELETE with competitorId", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(true) }]);
  assertEquals(await remove.execute({ blogId: "9", network: "twitter", competitorId: "77" }, ctx), {
    success: true,
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).searchParams.get("competitorId"), "77");
});
