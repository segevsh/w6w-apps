import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/timeline-get.ts";

Deno.test("timeline-get: GET gettimeline and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "eventType": "course_completion", "userId": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/gettimeline/event_type:course_completion,user_id:7",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
