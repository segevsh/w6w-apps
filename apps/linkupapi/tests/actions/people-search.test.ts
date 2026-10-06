import { assertEquals, assertRejects } from "@std/assert";
import peopleSearch from "../../actions/people-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("people-search: sends every input, unwraps data and credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  const out = await peopleSearch.execute({
    "accountId": "accountId-v",
    "searchUrl": "searchUrl-v",
    "keyword": "keyword-v",
    "firstName": "firstName-v",
    "lastName": "lastName-v",
    "title": "title-v",
    "companyName": "companyName-v",
    "companyUrl": "a; b",
    "pastCompany": "a; b",
    "location": "a; b",
    "schoolUrl": "a; b",
    "industry": "a; b",
    "network": "a; b",
    "connectionOf": "connectionOf-v",
    "followerOf": "followerOf-v",
    "offset": 5,
    "count": 5,
  } as never, ctx);
  assertEquals(out, { data: { ok: true }, creditsConsumed: 2 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "search_people",
    "params": {
      "search_url": "searchUrl-v",
      "keyword": "keyword-v",
      "first_name": "firstName-v",
      "last_name": "lastName-v",
      "title": "title-v",
      "company_name": "companyName-v",
      "company_url": ["a", "b"],
      "past_company": ["a", "b"],
      "location": ["a", "b"],
      "school_url": ["a", "b"],
      "industry": ["a", "b"],
      "network": ["a", "b"],
      "connection_of": "connectionOf-v",
      "follower_of": "followerOf-v",
      "offset": 5,
      "count": 5,
    },
  });
});

Deno.test("people-search: omits optional inputs that were not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { ok: true }, metadata: { credits_consumed: 2 } },
  }]);
  await peopleSearch.execute({ "accountId": "accountId-v" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.linkupapi.com/v2/profiles");
  assertEquals(JSON.parse(calls[0].body!), {
    "account_id": "accountId-v",
    "action": "search_people",
    "params": {},
  });
});

Deno.test("people-search: an error envelope is thrown with the vendor code", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { success: false, error: { code: "INSUFFICIENT_CREDITS", message: "no credits" } },
  }]);
  await assertRejects(
    async () => await peopleSearch.execute({ "accountId": "accountId-v" } as never, ctx),
    Error,
    "INSUFFICIENT_CREDITS",
  );
});
