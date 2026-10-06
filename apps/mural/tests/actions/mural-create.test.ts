import { assertEquals, assertRejects } from "@std/assert";
import muralCreate from "../../actions/mural-create.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "roomId": 77, "title": "Retro", "infinite": true };

Deno.test("mural-create: POST /murals", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { "value": { "id": "x1", "title": "T" } },
  }]);
  const out = await muralCreate.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/murals");
  assertEquals(calls[0].url.startsWith("https://app.mural.co/api/public/v1/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "roomId": 77, "title": "Retro", "infinite": true });
  assertEquals(out.id, "x1");
});

Deno.test("mural-create: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { "value": { "id": "x1", "title": "T" } },
  }]);
  await muralCreate.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("mural-create: a vendor error surfaces its own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "TOKEN_EXPIRED", message: "Your token has expired." },
  }]);
  const err = await assertRejects(async () => await muralCreate.execute(INPUT, ctx)) as Error;
  assertEquals(err.message.includes("(401)"), true);
  assertEquals(err.message.includes("TOKEN_EXPIRED"), true);
  assertEquals(err.message.includes("Your token has expired."), true);
});
