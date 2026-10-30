import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import lineStateGet from "../../actions/line-state-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("line-state-get: GETs /api/v2/lines/state with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], snapshot_at: "now", status: "OK" } }]);
  await lineStateGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/lines/state");
});
