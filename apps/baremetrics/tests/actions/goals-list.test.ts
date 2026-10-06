import { assert, assertEquals } from "@std/assert";
import goalsList from "../../actions/goals-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("goals-list: GET /v1/goals with the documented query/body", async () => {
  const { ctx, calls } = mockCtx([{ body: { goals: [] } }]);
  const out = await goalsList.execute({ per_page: 5, page: 5 }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/goals");
  assertEquals(queryOf(calls[0].url), { per_page: "5", page: "5" });

  const bare = mockCtx([{ body: {} }]);
  await goalsList.execute({}, bare.ctx);
  assertEquals(queryOf(bare.calls[0].url), {}, "unset optional params must not reach the query");
  assertEquals(calls[0].body, null);
  assert("goals" in out);
});

Deno.test("goals-list: declares type search and every required param", () => {
  assertEquals(goalsList.type, "search");
  const required = (goalsList.params ?? []).filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, []);
});

Deno.test("goals-list: surfaces a vendor error as a thrown message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Unauthorized. API Key not found (001)" },
  }]);
  let message = "";
  try {
    await goalsList.execute({ per_page: 5, page: 5 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("401") && message.includes("Unauthorized"), message);
});
