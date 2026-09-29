import { assertEquals } from "@std/assert";
import listSpaces from "../../actions/list-spaces.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-spaces: GETs /v1/spaces with search and pagination", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: listEnvelope({ spaces: [{ id: "sp1" }] }, { total: 1 }),
  }]);
  const out = await listSpaces.execute({ search: "Marketing", limit: 10 }, ctx) as {
    results: unknown[];
    total?: number;
  };
  assertEquals(pathOf(calls[0].url), "/v1/spaces");
  assertEquals(queryOf(calls[0].url), { search: "Marketing", limit: "10" });
  assertEquals(out.results.length, 1);
});
