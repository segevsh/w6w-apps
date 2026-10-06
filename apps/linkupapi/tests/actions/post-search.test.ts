import { assertEquals, assertRejects } from "@std/assert";
import postSearch from "../../actions/post-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-search: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await postSearch.execute({
    "accountId": "accountId-v",
    "keyword": "keyword-v",
    "count": 5,
    "offset": 5,
    "postType": "postType-v",
    "sortBy": "relevance",
    "postDate": "postDate-v",
    "profileUrl": "profileUrl-v",
    "companyUrl": "companyUrl-v",
    "authorCompany": "authorCompany-v",
    "authorIndustry": "authorIndustry-v",
    "authorJobTitle": "authorJobTitle-v",
    "mentionsMember": "mentionsMember-v",
    "mentionsOrganization": "mentionsOrganization-v",
    "postedBy": "postedBy-v",
  } as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "search",
    "params": {
      "keyword": "keyword-v",
      "count": 5,
      "offset": 5,
      "post_type": "postType-v",
      "sort_by": "relevance",
      "post_date": "postDate-v",
      "profile_url": "profileUrl-v",
      "company_url": "companyUrl-v",
      "author_company": "authorCompany-v",
      "author_industry": "authorIndustry-v",
      "author_job_title": "authorJobTitle-v",
      "mentions_member": "mentionsMember-v",
      "mentions_organization": "mentionsOrganization-v",
      "posted_by": "postedBy-v",
    },
  });
});

Deno.test("post-search: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await postSearch.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/content");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "search",
    "params": {},
  });
});

Deno.test("post-search: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await postSearch.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
