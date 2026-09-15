import { assertEquals } from "@std/assert";
import labelStoriesList from "../../actions/label-stories-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("label-stories-list: calls GET /labels/{id}/stories", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  await labelStoriesList.execute({ labelId: 4, includesDescription: true }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/labels/4/stories");
  assertEquals(queryOf(calls[0].url), { includes_description: "true" });
});
