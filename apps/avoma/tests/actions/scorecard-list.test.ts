import { assertEquals } from "@std/assert";
import scorecardList from "../../actions/scorecard-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("scorecard-list: GET /v1/scorecards/ folds the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "s1", name: "Discovery" }] }]);
  const out = await scorecardList.execute({}, ctx) as { results: unknown[]; count: number };
  assertEquals(pathOf(calls[0].url), "/v1/scorecards/");
  assertEquals(out.count, 1);
});
