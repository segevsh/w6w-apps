import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import epicStoriesList from "../../actions/epic-stories-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("epic-stories-list: calls GET /epics/{id}/stories", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  await epicStoriesList.execute({ epicId: 9, includesDescription: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/epics/9/stories");
  assertEquals(queryOf(calls[0].url), { includes_description: "true" });
});
