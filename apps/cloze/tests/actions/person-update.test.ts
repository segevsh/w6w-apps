import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/person-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "name": "Acme",
  "keywords": "vip, lead",
  "uniqueids": "ext-1",
  "email": "a@acme.com",
  "syncKey": "k1",
} as Record<string, unknown>;
const RESPONSE = { "errorcode": 0, "message": "ok" };

Deno.test("person-update: POST /v1/people/update", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/people/update");
  assert(calls[0].url.startsWith("https://api.cloze.com/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "name": "Acme",
    "keywords": ["vip", "lead"],
    "uniqueids": ["ext-1"],
    "emails": [{ "value": "a@acme.com" }],
    "syncKey": "k1",
  });
  assertEquals(out.ok, true);
  assertEquals(out.message, "ok");
  assertEquals("errorcode" in out, false);
});

Deno.test("person-update: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
  assert(!calls[0].url.includes("api_key"));
});

Deno.test("person-update: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorcode: 1, message: "The API key was not found" },
  }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("(401, errorcode 1)"));
  assert(err.message.includes("The API key was not found"));
});

Deno.test("person-update: a 200 with a non-zero errorcode is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { errorcode: 3, message: "nope" } }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("nope"));
});
