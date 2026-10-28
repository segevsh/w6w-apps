import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-create.ts";

Deno.test("list-create: POSTs /lists with name + board", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  await action.execute({ name: "Backlog", idBoard: "b1" }, ctx);
  assertEquals(calls[0].method, "POST");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/1/lists");
  assertEquals(q.get("name"), "Backlog");
  assertEquals(q.get("idBoard"), "b1");
});
