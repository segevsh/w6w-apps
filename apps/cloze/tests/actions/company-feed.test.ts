import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-feed.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "modifiedafter": "now", "pagesize": 2 } as Record<string, unknown>;
const RESPONSE = {
  "errorcode": 0,
  "availablecount": 3,
  "cursor": "c1",
  "companies": [{ "syncKey": "k1" }],
};

Deno.test("company-feed: GET /v1/companies/feed", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/companies/feed");
  assert(calls[0].url.startsWith("https://api.cloze.com/"));
  assertEquals(queryOf(calls[0].url), { "modifiedafter": "now", "pagesize": "2" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out.count, 1);
  assertEquals(out.cursor, "c1");
  assertEquals("errorcode" in out, false);
});

Deno.test("company-feed: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
  assert(!calls[0].url.includes("api_key"));
});

Deno.test("company-feed: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorcode: 1, message: "The API key was not found" },
  }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("(401, errorcode 1)"));
  assert(err.message.includes("The API key was not found"));
});

Deno.test("company-feed: a 200 with a non-zero errorcode is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { errorcode: 3, message: "nope" } }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("nope"));
});
