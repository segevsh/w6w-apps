import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-count.ts";

Deno.test("user-count: hits GET /users/count", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object: "total_count", total_count: 42 },
  }]);
  const out = await action.execute!({ query: "ada" }, ctx) as { total_count: number };
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/count");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), "ada");
  assertEquals(out.total_count, 42);
});
