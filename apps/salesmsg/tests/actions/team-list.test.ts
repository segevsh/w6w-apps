import { assert, assertEquals } from "@std/assert";
import teamList from "../../actions/team-list.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("team-list: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const result = await teamList.execute({ "limit": 5, "has_membership": true }, ctx) as {
    items: unknown[];
    meta?: Record<string, unknown>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/teams`);
  assertEquals(queryOf(calls[0].url), { "limit": "5", "has_membership": "true" });
  assertEquals(calls[0].body, null);
  assertEquals(result.items.length, 2);
});

Deno.test("team-list: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await teamList.execute({ "limit": 5, "has_membership": true }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
