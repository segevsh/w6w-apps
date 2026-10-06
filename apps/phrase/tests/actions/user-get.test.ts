import { assert, assertEquals, assertRejects } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: sends GET /v2/user", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x1", name: "n" } }]);
  const input = {};
  const out = await userGet.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/user");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "x1");
  assert(!("authorization" in calls[0].headers), "credentials belong to sign, not the action");
});

Deno.test("user-get: surfaces Phrase's validation message on a 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("Validation failed") }]);
  const err = await assertRejects(async () => {
    await userGet.execute({}, ctx);
  });
  assert((err as Error).message.includes("Validation failed"), (err as Error).message);
});

Deno.test("user-get: declares key, type and every param it reads", () => {
  assertEquals(userGet.key, "user-get");
  assertEquals(userGet.type, "read");
  const declared = new Set((userGet.params ?? []).map((p) => p.key));
  for (const k of Object.keys({})) assert(declared.has(k), `missing param ${k}`);
});
