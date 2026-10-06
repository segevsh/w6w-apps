import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/companies-research.ts";

const RESPONSE = { "success": true, "requestIds": ["c1"] };

Deno.test("companies-research: calls POST /api/client/v2/companies/research and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "searchResultIds": ["cmp_1"],
    "companies": [{ "domain": "acme.com" }],
    "skipDeduplicationCheck": false,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/companies/research");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "searchResultIds": ["cmp_1"],
    "companies": [{ "domain": "acme.com" }],
    "skipDeduplicationCheck": false,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("companies-research: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("companies-research: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "searchResultIds": ["cmp_1"],
        "companies": [{ "domain": "acme.com" }],
        "skipDeduplicationCheck": false,
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
