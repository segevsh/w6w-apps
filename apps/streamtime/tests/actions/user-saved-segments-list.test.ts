import { assertEquals } from "@std/assert";
import userSavedSegmentsList from "../../actions/user-saved-segments-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-saved-segments-list: reads the nested route and names the array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Open jobs" }] }]);
  const result = await userSavedSegmentsList.execute({ userId: 9 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/users/9/saved_segments");
  assertEquals(result, { savedSegments: [{ id: 1, name: "Open jobs" }] });
});

/**
 * The one array-valued query parameter in the API: the vendor documents it as "a
 * JSON array in the query string", not as a repeated key.
 */
Deno.test("user-saved-segments-list: the type filter is a JSON array in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await userSavedSegmentsList.execute({ userId: 9, savedSegmentTypeIds: [3, 4] }, ctx);
  assertEquals(queryOf(calls[0].url).saved_segment_type_ids, "[3,4]");
});

Deno.test("user-saved-segments-list: no filter means no query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await userSavedSegmentsList.execute({ userId: 9 }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
