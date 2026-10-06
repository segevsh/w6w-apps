import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-find.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "freeformquery": "acme", "pagesize": 5, "stage": "lead" } as Record<
  string,
  unknown
>;
const RESPONSE = {
  "errorcode": 0,
  "availablecount": 1,
  "pagenumber": 1,
  "pagesize": 5,
  "companies": [{ "syncKey": "k1", "name": "Acme" }],
};

Deno.test("company-find: GET /v1/companies/find", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/companies/find");
  assert(calls[0].url.startsWith("https://api.cloze.com/"));
  assertEquals(queryOf(calls[0].url), {
    "freeformquery": "acme",
    "pagesize": "5",
    "stage": "lead",
  });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(out.count, 1);
  assertEquals(out.availableCount, 1);
  assertEquals(out.pageNumber, 1);
  assertEquals("errorcode" in out, false);
});

Deno.test("company-find: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
  assert(!calls[0].url.includes("api_key"));
});

Deno.test("company-find: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorcode: 1, message: "The API key was not found" },
  }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("(401, errorcode 1)"));
  assert(err.message.includes("The API key was not found"));
});

Deno.test("company-find: a 200 with a non-zero errorcode is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { errorcode: 3, message: "nope" } }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("nope"));
});
