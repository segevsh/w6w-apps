import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import rcsGet from "../../actions/rcs-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("rcs-get: unwraps the message", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1", status: "SENT" }) }]);
  const out = await rcsGet.execute({ id: "r1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/rcs/messages/r1");
  assertEquals(out.status, "SENT");
});
