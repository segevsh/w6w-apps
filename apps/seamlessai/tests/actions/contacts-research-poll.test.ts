import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-research-poll.ts";

const RESPONSE = { "success": true, "data": [{ "requestId": "r1", "status": "done" }] };

Deno.test("contacts-research-poll: calls GET /api/client/v2/contacts/research/poll and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({ "requestIds": ["r1", "r2"] }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/contacts/research/poll");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "requestIds": "r1,r2" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("contacts-research-poll: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "requestIds": ["r1", "r2"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), { "requestIds": "r1,r2" });
  assertEquals(calls[0].body, null);
});

Deno.test("contacts-research-poll: refuses a missing requestIds before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({} as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("contacts-research-poll: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "requestIds": ["r1", "r2"] }, ctx),
    Error,
    "insufficientCredits",
  );
});
