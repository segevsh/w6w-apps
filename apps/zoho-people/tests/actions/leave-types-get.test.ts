import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/leave-types-get.ts";

Deno.test("leave-types-get: GETs getLeaveTypeDetails with userId", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: {
      response: {
        message: "Data fetched successfully",
        result: [{ Name: "Hour based", Id: 46007, Unit: "Hours", BalanceCount: 20 }],
        status: 0,
      },
    },
  }]);
  const out = await action.execute({ userId: "j@x.com" }, ctx) as { result: Array<{ Id: number }> };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/people/api/leave/getLeaveTypeDetails");
  assertEquals(url.searchParams.get("userId"), "j@x.com");
  assertEquals(out.result[0].Id, 46007);
});

Deno.test("leave-types-get: requires userId", async () => {
  const { ctx, calls } = mockPeopleCtx([]);
  await assertRejects(
    () => action.execute({ userId: "" }, ctx) as Promise<unknown>,
    Error,
    "userId",
  );
  assertEquals(calls.length, 0);
});
