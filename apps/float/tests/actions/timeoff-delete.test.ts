import { assertEquals } from "@std/assert";
import timeoffDelete from "../../actions/timeoff-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("timeoff-delete - DELETEs /timeoffs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeoffDelete.execute({ timeoff_id: 5 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/timeoffs/5");
  assertEquals(out, { deleted: true, timeoff_id: 5 });
});
