import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-contacts-remove.ts";

const RESPONSE = { "success": true };

Deno.test("campaign-contacts-remove: calls DELETE /api/client/v2/campaigns/{id}/contacts and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({ "id": "5", "contactIds": ["11"] }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/campaigns/5/contacts");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "contactIds": ["11"] });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("campaign-contacts-remove: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "id": "5", "contactIds": ["11"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "contactIds": ["11"] });
});

Deno.test("campaign-contacts-remove: refuses a missing id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ "contactIds": ["11"] } as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("campaign-contacts-remove: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "id": "5", "contactIds": ["11"] }, ctx),
    Error,
    "insufficientCredits",
  );
});
