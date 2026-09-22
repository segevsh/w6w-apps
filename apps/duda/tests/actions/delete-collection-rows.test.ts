import { assert, assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/delete-collection-rows.ts";

Deno.test("delete-collection-rows: DELETEs with the row ids as a raw JSON array body", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 204 }]);
  const result = await action.execute!(
    { siteName: "abc1234d", collectionName: "Team", rowIds: ["row-1", "row-2"] },
    ctx,
  );

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/abc1234d/collection/Team/row");
  // Ids in the body, bare — not wrapped in an object and not in the path.
  assertEquals(JSON.parse(calls[0].body!), ["row-1", "row-2"]);
  assertEquals(result, { status: 204 });
});

Deno.test("delete-collection-rows: accepts the ids as JSON text too", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 204 }]);
  await action.execute!(
    { siteName: "abc", collectionName: "Team", rowIds: '["row-1"]' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), ["row-1"]);
});

Deno.test("delete-collection-rows: refuses a non-array before spending a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  const err = await Promise.resolve(action.execute!(
    { siteName: "abc", collectionName: "Team", rowIds: { not: "an array" } },
    ctx,
  )).catch((e: Error) => e);
  assert(err instanceof Error);
  assert(/non-empty JSON array/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("delete-collection-rows: is idempotent — deleting an absent id converges", () => {
  assertEquals(action.idempotent, true);
  assertEquals(action.params!.find((p) => p.key === "rowIds")?.type, "json");
});
