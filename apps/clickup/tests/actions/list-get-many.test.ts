import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get-many.ts";

Deno.test("list-get-many: GETs /folder/{id}/list when a folder is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { lists: [] } }]);
  await action.execute!({ folderId: "f1", archived: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/folder/f1/list");
  assertEquals(url.searchParams.get("archived"), "true");
});

Deno.test("list-get-many: GETs /space/{id}/list for folderless lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { lists: [] } }]);
  await action.execute!({ spaceId: "s1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/space/s1/list");
});

Deno.test("list-get-many: rejects when neither folder nor space is supplied", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "Folder ID or a Space ID",
  );
});
