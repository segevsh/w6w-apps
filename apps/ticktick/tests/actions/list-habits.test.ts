import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-habits.ts";

Deno.test("list-habits: GETs /habit with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "habit-1" }] }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.ticktick.com/open/v1/habit");
  assertEquals(out, { items: [{ id: "habit-1" }], count: 1 });
});

Deno.test("list-habits: an account with no habits is `[]`", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  assertEquals(await action.execute!({}, ctx), { items: [], count: 0 });
});

Deno.test("list-habits: declares no params", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "search");
});
