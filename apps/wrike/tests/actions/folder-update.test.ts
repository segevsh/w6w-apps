import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import folderUpdate from "../../actions/folder-update.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

test("folder-update: PUTs to /folders/{folderId} without forcing withInvitations", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "F1", title: "Renamed" }]) },
  ]);
  await folderUpdate.execute({ folderId: "F1", title: "Renamed" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v4/folders/F1");
  assertEquals(queryOf(calls[0].url), { title: "Renamed" });
});

/**
 * Wrike's own OpenAPI marks `withInvitations` as `required: true` on THIS one
 * endpoint (and `false` everywhere else it appears) — treated as a documented
 * quirk, not enforced, per the action's own doc comment.
 */
test("folder-update: withInvitations is not required despite the vendor spec's inconsistency", () => {
  const p = folderUpdate.params?.find((p) => p.key === "withInvitations");
  assertEquals(p, undefined, "not modeled as a param at all — never forced on the caller");
});

test("folder-update: is declared idempotent", () => {
  assertEquals(folderUpdate.idempotent, true);
});
