import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/survey-get-answers.ts";

Deno.test("survey-get-answers: GET getsurveyanswers and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "surveyId": 6, "userId": 7 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/getsurveyanswers/survey_id:6,user_id:7",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});
