import { assert, assertEquals } from "@std/assert";
import { mockConnectedCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/update-collection-rows.ts";

Deno.test("update-collection-rows: PUTs the raw array of { id, data } objects", async () => {
  const { ctx, calls } = mockConnectedCtx([{ status: 204 }]);
  const rows = [{ id: "row-1", data: { Name: "Ada", Email: "ada@acme.com" } }];
  const result = await action.execute!(
    { siteName: "abc1234d", collectionName: "Team", rows },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/sites/multiscreen/abc1234d/collection/Team/row");
  assertEquals(JSON.parse(calls[0].body!), rows);
  assertEquals(result, { status: 204 });
});

/**
 * The one behavior this action most needs to communicate: Duda overwrites the
 * whole row, so a partial `data` object is a data-loss bug, not a patch.
 */
Deno.test("update-collection-rows: the hint says an omitted field is blanked", () => {
  const rows = action.params!.find((p) => p.key === "rows");
  assert(/overwrites the whole row/i.test(rows!.hint!), rows!.hint);
  assert(/blanked/i.test(rows!.hint!), rows!.hint);
  assertEquals(rows?.required, true);
});

/** Resending the same full-row payload converges on the same state. */
Deno.test("update-collection-rows: is idempotent", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("update-collection-rows: refuses an empty array before spending a request", async () => {
  const { ctx, calls } = mockConnectedCtx([]);
  const err = await Promise.resolve(action.execute!(
    { siteName: "abc", collectionName: "Team", rows: [] },
    ctx,
  )).catch((e: Error) => e);
  assert(err instanceof Error);
  assert(/non-empty JSON array/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});
