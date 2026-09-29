import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: repeats array filters and sends status as 1/0", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await userList.execute({ offices: [1, 2], status: true, limit: 10 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/public/users");
  const q = queryOf(calls[0].url);
  assertEquals(q["offices[]"], ["1", "2"]);
  assertEquals(q["status"], ["1"]);
  assertEquals(q["limit"], ["10"]);
});

Deno.test("user-list: status=false is sent as 0, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await userList.execute({ status: false }, ctx);
  assertEquals(queryOf(calls[0].url)["status"], ["0"]);
});
