import { assertEquals, assertRejects } from "@std/assert";
import a from "../../actions/get-me.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

Deno.test("get-me: GET /me with no query", async () => {
  const { call, result } = await run(a, {}, { _id: "U", username: "bot" });
  assertEquals(call.method, "GET");
  assertEquals(call.url, `${BASE}/me`);
  assertEquals((result as { username: string }).username, "bot");
});

Deno.test("get-me: an expired token surfaces the vendor 401 text", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { success: false, status: "error", message: "You must be logged in to do this." },
  }]);
  await assertRejects(async () => await a.execute({}, ctx), Error, "You must be logged in");
});
