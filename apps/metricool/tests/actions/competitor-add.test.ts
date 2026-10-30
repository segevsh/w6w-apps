import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import add from "../../actions/competitor-add.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("competitor-add: POST with the account in id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(true) }]);
  assertEquals(await add.execute({ blogId: "9", network: "twitter", id: "rival" }, ctx), {
    success: true,
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/analytics/competitors/twitter");
  assertEquals(new URL(calls[0].url).searchParams.get("id"), "rival");
});
