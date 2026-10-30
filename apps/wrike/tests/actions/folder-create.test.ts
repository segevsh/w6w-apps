import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import folderCreate from "../../actions/folder-create.ts";
import { envelope, mockWrikeCtx, pathOf, queryOf } from "../_helpers.ts";

test("folder-create: POSTs to /folders/{folderId}/folders; a `project` object creates a project", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "F2", title: "Q4 Launch", scope: "WsFolder" }]) },
  ]);
  await folderCreate.execute(
    { folderId: "ROOT", title: "Q4 Launch", project: { status: "Green" } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/folders/ROOT/folders");
  assertEquals(queryOf(calls[0].url), { title: "Q4 Launch", project: '{"status":"Green"}' });
});

test("folder-create: is declared non-idempotent", () => {
  assertEquals(folderCreate.idempotent, false);
});
