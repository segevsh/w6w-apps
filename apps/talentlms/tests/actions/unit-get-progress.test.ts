import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/unit-get-progress.ts";

Deno.test("unit-get-progress: GET getusersprogressinunits and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "unitId": 5 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.talentlms.com/api/v1/getusersprogressinunits/unit_id:5");
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
