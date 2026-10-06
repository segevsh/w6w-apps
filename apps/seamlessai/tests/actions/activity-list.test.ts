import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-list.ts";

const RESPONSE = { "success": true, "data": [{ "activityId": "1" }] };

Deno.test("activity-list: calls GET /api/client/v2/activity and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({
    "contactId": 11,
    "campaignIdentifier": "camp-q4",
    "searchText": "reply",
    "limit": 50,
    "offset": 100,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/activity");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "contactId": "11",
    "campaignIdentifier": "camp-q4",
    "searchText": "reply",
    "limit": "50",
    "offset": "100",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("activity-list: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
});

Deno.test("activity-list: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "contactId": 11,
        "campaignIdentifier": "camp-q4",
        "searchText": "reply",
        "limit": 50,
        "offset": 100,
      }, ctx),
    Error,
    "insufficientCredits",
  );
});
