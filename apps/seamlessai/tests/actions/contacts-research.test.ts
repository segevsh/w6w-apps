import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-research.ts";

const RESPONSE = { "success": true, "requestIds": ["r1"] };

Deno.test("contacts-research: calls POST /api/client/v2/contacts/research and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "searchResultIds": ["sr_1", "sr_2"],
    "contacts": [{ "contactName": "Jane Doe", "companyName": "Acme" }],
    "isJobChange": false,
    "listIds": ["3"],
    "skipDeduplicationCheck": true,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/contacts/research");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "searchResultIds": ["sr_1", "sr_2"],
    "contacts": [{ "contactName": "Jane Doe", "companyName": "Acme" }],
    "isJobChange": false,
    "listIds": [3],
    "skipDeduplicationCheck": true,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("contacts-research: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("contacts-research: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "searchResultIds": ["sr_1", "sr_2"],
        "contacts": [{ "contactName": "Jane Doe", "companyName": "Acme" }],
        "isJobChange": false,
        "listIds": ["3"],
        "skipDeduplicationCheck": true,
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
