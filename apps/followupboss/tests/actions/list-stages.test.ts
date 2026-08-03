import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import listStages from "../../actions/list-stages.ts";

Deno.test("list-stages: GETs /stages with the documented sort options", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "stages" }, stages: [{ id: 1, name: "Contact" }] },
  }]);
  await listStages.execute({ sort: "orderWeight", limit: 100 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/stages");
  assertEquals(url.searchParams.get("sort"), "orderWeight");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(optionValues(listStages, "sort"), ["orderWeight", "id", "name"]);
});
