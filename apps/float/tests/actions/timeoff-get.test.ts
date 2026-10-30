import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import timeoffGet from "../../actions/timeoff-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("timeoff-get - GETs /timeoffs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { timeoff_id: 1, people_ids: [23442] } }]);
  const out = await timeoffGet.execute({ timeoff_id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/timeoffs/1");
  assertEquals(out, { timeoff_id: 1, people_ids: [23442] });
});
