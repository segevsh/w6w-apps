import { assertEquals } from "@std/assert";
import timeoffUpdate from "../../actions/timeoff-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("timeoff-update - PATCHes /timeoffs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { timeoff_id: 5, hours: 4 } }]);
  const out = await timeoffUpdate.execute({ timeoff_id: 5, hours: 4, fullDay: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/timeoffs/5");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.hours, 4);
  assertEquals(body.full_day, 0);
  assertEquals(out, { timeoff_id: 5, hours: 4 });
});
