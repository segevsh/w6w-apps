import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/content-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "style": "note",
  "subject": "Met",
  "uniqueid": "n1",
  "source": "example.com",
} as Record<string, unknown>;
const RESPONSE = { "errorcode": 0, "message": "ok" };

Deno.test("content-create: POST /v1/timeline/content/create", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const out = await action.execute(INPUT, ctx) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/timeline/content/create");
  assert(calls[0].url.startsWith("https://api.cloze.com/"));
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "style": "note",
    "subject": "Met",
    "uniqueid": "n1",
    "source": "example.com",
  });
  assertEquals(out.ok, true);
  assertEquals("errorcode" in out, false);
});

Deno.test("content-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
  assert(!calls[0].url.includes("api_key"));
});

Deno.test("content-create: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorcode: 1, message: "The API key was not found" },
  }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("(401, errorcode 1)"));
  assert(err.message.includes("The API key was not found"));
});

Deno.test("content-create: a 200 with a non-zero errorcode is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { errorcode: 3, message: "nope" } }]);
  const err = await assertRejects(async () => await action.execute(INPUT, ctx)) as Error;
  assert(err.message.includes("nope"));
});
