import { assertEquals, assertRejects } from "@std/assert";
import jobCandidatesList from "../../actions/job-candidates-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("job-candidates-list: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await jobCandidatesList.execute(
    {
      "accountId": "accountId-v",
      "jobId": "jobId-v",
      "count": 5,
      "offset": 5,
      "ratings": "ratings-v",
      "sortType": "APPLIED_DATE",
      "sortOrder": "ASCENDING",
    } as never,
    ctx,
  );
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/recruiter");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_candidates",
    "params": {
      "job_id": "jobId-v",
      "count": 5,
      "offset": 5,
      "ratings": "ratings-v",
      "sortType": "APPLIED_DATE",
      "sortOrder": "ASCENDING",
    },
  });
});

Deno.test("job-candidates-list: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await jobCandidatesList.execute({ "accountId": "accountId-v", "jobId": "jobId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/recruiter");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "get_candidates",
    "params": { "job_id": "jobId-v" },
  });
});

Deno.test("job-candidates-list: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await jobCandidatesList.execute(
        { "accountId": "accountId-v", "jobId": "jobId-v" } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
