import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/holidays-get.ts";

Deno.test("holidays-get: GETs getHolidays with userId", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { response: { result: [{ Name: "Test", Id: 65001 }], status: 0 } },
  }]);
  const out = await action.execute({ userId: "3000000011693" }, ctx) as { result: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/people/api/leave/getHolidays");
  assertEquals(new URL(calls[0].url).searchParams.get("userId"), "3000000011693");
  assertEquals(out.result.length, 1);
});

Deno.test("holidays-get: requires userId", async () => {
  const { ctx } = mockPeopleCtx([]);
  await assertRejects(
    () => action.execute({ userId: "" }, ctx) as Promise<unknown>,
    Error,
    "userId",
  );
});
