import { assertEquals } from "@std/assert";
import formSubmissionUpdate from "../../actions/form-submission-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-submission-update: PUTs tags as an array and the rest verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "FOR1" } }]);
  await formSubmissionUpdate.execute(
    {
      accountId: "ACC1",
      formSubmissionId: "FOR1",
      tags: "New Client",
      note: "Call back",
      value: "$1.00",
      leadStatus: "good_lead",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/form_submissions/FOR1.json");
  assertEquals(JSON.parse(calls[0].body!), {
    tags: ["New Client"],
    note: "Call back",
    value: "$1.00",
    lead_status: "good_lead",
  });
});
