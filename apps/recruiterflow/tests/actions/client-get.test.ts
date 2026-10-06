import { assertEquals } from "@std/assert";
import clientGet from "../../actions/client-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client-get: GET /client/get with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await clientGet.execute({ "id": 9 } as never, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/client/get");
  assertEquals(queryOf(calls[0].url), { "id": "9" });
  assertEquals(calls[0].body, null);
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("client-get: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await clientGet.execute({ "id": 9 } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
