import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import timelogGet from "../../actions/timelog-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

test("timelog-get: joins ids into the path", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "TL1" }]) }]);
  await timelogGet.execute({ timelogIds: "TL1,TL2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/timelogs/TL1,TL2");
});
