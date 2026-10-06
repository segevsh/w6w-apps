import { assertEquals } from "@std/assert";
import action from "../../actions/campaign-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: GET /campaigns passes search, limit and offset", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Name: "Spring", Status: "Draft" }] }]);
  const out = await action.execute({ search: "spr", limit: 5, offset: 1 }, ctx) as {
    count: number;
  };
  assertEquals(pathOf(calls[0].url), "/v4/campaigns");
  assertEquals(queryOf(calls[0].url), { search: "spr", limit: "5", offset: "1" });
  assertEquals(out.count, 1);
});
