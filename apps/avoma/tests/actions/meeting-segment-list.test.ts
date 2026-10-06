import { assertEquals } from "@std/assert";
import segments from "../../actions/meeting-segment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("meeting-segment-list: the query parameter is uuid, not meeting_uuid", async () => {
  const body = { intro: [[0, 30]], demo: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await segments.execute({ meetingUuid: "m1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/meeting_segments/");
  assertEquals(queryOf(calls[0].url), { uuid: "m1" });
  assertEquals(out, body);
});
