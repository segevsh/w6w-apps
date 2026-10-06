import { assertEquals } from "@std/assert";
import action from "../../actions/task-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("task-list: GET /tasks?query=status%3Aopen&search=all&limit=5", async () => {
  const { ctx, calls } = mockCtx([{
    body: { results: [{ _id: "k1" }], next: "n", hasNext: false },
  }]);
  const out = await action.execute!(
    { query: "status:open", search: "all", limit: 5 } as never,
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.mixmax.com/v1/tasks?query=status%3Aopen&search=all&limit=5",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ _id: "k1" }], next: "n", hasNext: false });
});
