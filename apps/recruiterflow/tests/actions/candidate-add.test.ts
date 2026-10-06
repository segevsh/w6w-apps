import { assertEquals } from "@std/assert";
import candidateAdd from "../../actions/candidate-add.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("candidate-add: POST /candidate/add with the mapped wire fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { RESULT: "success", data: { id: 1 } } }]);
  const out = await candidateAdd.execute(
    { "name": "Ann Lee", "email": "ann@x.co", "fields": '{"skills":["go"]}' } as never,
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/candidate/add");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "skills": ["go"],
    "name": "Ann Lee",
    "email": [{ "email": "ann@x.co", "is_primary": 1 }],
  });
  assertEquals((out.data as { id: number }).id, 1);
});

Deno.test("candidate-add: a vendor error is thrown with its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Invalid API key" } }]);
  let msg = "";
  try {
    await candidateAdd.execute(
      { "name": "Ann Lee", "email": "ann@x.co", "fields": '{"skills":["go"]}' } as never,
      ctx,
    );
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg.includes("HTTP 401") && msg.includes("Invalid API key"), true);
});
