import { assertEquals } from "@std/assert";
import iterationStoriesList from "../../actions/iteration-stories-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("iteration-stories-list: calls GET /iterations/{id}/stories", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  await iterationStoriesList.execute({ iterationId: 3, includesDescription: false }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/iterations/3/stories");
  assertEquals(queryOf(calls[0].url), { includes_description: "false" });
});
