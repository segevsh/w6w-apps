import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: GET /users with filters and a 500-max page size", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "u1" }]) }]);
  await userList.execute({
    groupId: "g1",
    userIds: ["u1", "u2"],
    sortBy: "EMAIL",
    sortDirection: "DESC",
    limit: 500,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/users");
  assertEquals(queryOf(calls[0].url), {
    groupId: "g1",
    userIds: "u1,u2",
    sortBy: "EMAIL",
    sortDirection: "DESC",
    limit: "500",
  });
});

Deno.test("user-list: the limit param allows up to 500", () => {
  const limit = userList.params!.find((p) => p.key === "limit")!;
  assertEquals(limit.validation?.max, 500);
});
