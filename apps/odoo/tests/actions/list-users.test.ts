import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-users.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("list-users: is a search action over res.users", () => {
  assertEquals(action.key, "list-users");
  assertEquals(action.type, "search");
  assertEquals(action.resource, "res.users");
});

Deno.test("list-users: search_reads res.users", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 6, name: "Joel" }] }]);
  await action.execute({ domain: [["active", "=", true]] }, ctx);
  assertEquals(executeKwArgs(calls[0]), {
    model: "res.users",
    method: "search_read",
    args: [],
    kwargs: { domain: [["active", "=", true]] },
  });
});

Deno.test("list-users: notes that reading users is itself an access right", () => {
  assert(/access/i.test(description(action)));
});
