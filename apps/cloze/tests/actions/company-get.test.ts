import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "id": "k1", "format": true } as Record<string, unknown>;
const RESPONSE = { "errorcode": 0, "company": { "syncKey": "k1", "name": "Acme" } };

Deno.test("company-get: GET /v1/companies/get", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/companies/get");
  assert(calls[0].url.startsWith("https://api.cloze.com/"));
  assertEquals(queryOf(calls[0].url), { "id": "k1", "format": "true" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out.syncKey, "k1");
  assertEquals(out.name, "Acme");
  assertEquals("errorcode" in out, false);
});

Deno.test("company-get: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
  assert(!calls[0].url.includes("api_key"));
});

Deno.test("company-get: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorcode: 1, message: "The API key was not found" },
  }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("(401, errorcode 1)"));
  assert(err.message.includes("The API key was not found"));
});

Deno.test("company-get: a 200 with a non-zero errorcode is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { errorcode: 3, message: "nope" } }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("nope"));
});
