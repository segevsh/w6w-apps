import { assertEquals } from "@std/assert";
import action from "../../actions/template-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-list: GET /v1/groups (the API's name for credential templates)", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "g1", name: "T" }], "N") }]);
  const out = await action.execute({ limit: 100, cursor: "C" }, ctx) as {
    pagination: { next: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/groups");
  assertEquals(queryOf(calls[0].url), { limit: "100", cursor: "C" });
  assertEquals(out.pagination.next, "N");
});
