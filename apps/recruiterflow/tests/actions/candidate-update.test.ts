import { assertEquals } from "@std/assert";
import candidateUpdate from "../../actions/candidate-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-update: POST /candidate/update with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await candidateUpdate.execute({ "id": 42, "title": "CTO" } as never, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/update");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), { "id": 42, "title": "CTO" });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("candidate-update: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateUpdate.execute({ "id": 42, "title": "CTO" } as never, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
