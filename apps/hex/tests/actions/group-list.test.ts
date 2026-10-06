import { assertEquals } from "@std/assert";
import action from "../../actions/group-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("group-list: GET /groups with cursor pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "x1" }], "next") }]);
  const out = await action.execute({ limit: 10, after: "c0" }, ctx) as {
    values: unknown[];
    pagination: { after: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/groups");
  assertEquals(queryOf(calls[0].url), { limit: "10", after: "c0" });
  assertEquals(out.pagination.after, "next");
});
