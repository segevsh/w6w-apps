import { assertEquals, assertRejects } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("job-create: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await jobCreate.execute({
    "accountId": "accountId-v",
    "companyUrl": "companyUrl-v",
    "title": "title-v",
    "place": "place-v",
    "htmlDescription": "htmlDescription-v",
    "employmentStatus": "INTERNSHIP",
    "workplace": "3",
    "contactEmail": "contactEmail-v",
    "skills": "a; b",
    "jobFunctions": "a; b",
    "industrySectors": "a; b",
    "autoRejectionTemplate": "autoRejectionTemplate-v",
  } as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/recruiter");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "create_job",
    "params": {
      "company_url": "companyUrl-v",
      "title": "title-v",
      "place": "place-v",
      "html_description": "htmlDescription-v",
      "employment_status": "INTERNSHIP",
      "workplace": "3",
      "contact_email": "contactEmail-v",
      "skills": ["a", "b"],
      "job_functions": ["a", "b"],
      "industry_sectors": ["a", "b"],
      "auto_rejection_template": "autoRejectionTemplate-v",
    },
  });
});

Deno.test("job-create: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await jobCreate.execute(
    {
      "accountId": "accountId-v",
      "companyUrl": "companyUrl-v",
      "title": "title-v",
      "place": "place-v",
      "htmlDescription": "htmlDescription-v",
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/recruiter");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "create_job",
    "params": {
      "company_url": "companyUrl-v",
      "title": "title-v",
      "place": "place-v",
      "html_description": "htmlDescription-v",
    },
  });
});

Deno.test("job-create: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () =>
      await jobCreate.execute(
        {
          "accountId": "accountId-v",
          "companyUrl": "companyUrl-v",
          "title": "title-v",
          "place": "place-v",
          "htmlDescription": "htmlDescription-v",
        } as never,
        ctx,
      ),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
