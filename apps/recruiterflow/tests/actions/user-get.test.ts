import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("user-get: GET /user/get with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await userGet.execute({ "email": "a@b.co" } as never, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/user/get");
  assertEquals(queryOf(calls[0].url), { "email": "a@b.co" });
  assertEquals(calls[0].body, null);
  assertEquals((out.data as { id: number }).id, 1);
});

test("user-get: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await userGet.execute({ "email": "a@b.co" } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
