import { assertEquals } from "@std/assert";
import formSubmissionList from "../../actions/form-submission-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-submission-list: hits form_submissions.json and forwards person_lead/lead_status", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope("form_submissions", [{ id: "FOR1" }]) },
  ]);
  const out = await formSubmissionList.execute(
    { accountId: "ACC1", personLead: true, leadStatus: "good_lead" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/form_submissions.json");
  const q = queryOf(calls[0].url);
  assertEquals(q.person_lead, "true");
  assertEquals(q.lead_status, "good_lead");
  assertEquals(out.form_submissions, [{ id: "FOR1" }]);
});

Deno.test("form-submission-list: both submitted_at and created_at remain valid sort options", () => {
  const sortParam = formSubmissionList.params?.find((p) => p.key === "sort");
  const values = (sortParam?.options as Array<{ value: string }> | undefined)?.map((o) => o.value);
  assertEquals(values?.includes("submitted_at"), true);
  assertEquals(values?.includes("created_at"), true);
});
