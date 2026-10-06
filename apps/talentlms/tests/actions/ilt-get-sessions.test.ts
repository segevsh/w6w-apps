import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/ilt-get-sessions.ts";

Deno.test("ilt-get-sessions: GET getiltsessions and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "iltId": 9 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/getiltsessions/ilt_id:9");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
