import { assertEquals } from "@std/assert";
import candidateGet from "../../actions/candidate-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-get: GET /candidate/get with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await candidateGet.execute({ "id": 42 } as never, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/get");
  assertEquals(queryOf(calls[0].url), { "id": "42" });
  assertEquals(calls[0].body, null);
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("candidate-get: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateGet.execute({ "id": 42 } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
