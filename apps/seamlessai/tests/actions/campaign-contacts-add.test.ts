import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-contacts-add.ts";

const RESPONSE = { "success": true, "data": { "contactsAdded": 2 } };

Deno.test("campaign-contacts-add: calls POST /api/client/v2/campaigns/{id}/contacts and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({ "id": "5", "contactIds": ["11", "12"] }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/campaigns/5/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "contactIds": ["11", "12"] });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("campaign-contacts-add: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "id": "5", "contactIds": ["11", "12"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "contactIds": ["11", "12"] });
});

Deno.test("campaign-contacts-add: refuses a missing id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () =>
    await action.execute!({ "contactIds": ["11", "12"] } as never, ctx)
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-contacts-add: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "id": "5", "contactIds": ["11", "12"] }, ctx),
    Error,
    "insufficientCredits",
  );
});
