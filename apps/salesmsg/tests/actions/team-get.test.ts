import { assert, assertEquals } from "@std/assert";
import teamGet from "../../actions/team-get.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("team-get: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await teamGet.execute({ "team": 7 }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/teams/7`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("team-get: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await teamGet.execute({ "team": 7 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
