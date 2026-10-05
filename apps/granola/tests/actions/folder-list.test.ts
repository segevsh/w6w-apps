import { assertEquals, assertRejects } from "@std/assert";
import folderList from "../../actions/folder-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("folder-list: GET /v1/folders with paging", async () => {
  const page = { folders: [{ id: "fol_a", object: "folder" }], hasMore: false, cursor: null };
  const { ctx, calls } = mockCtx([{ body: page }]);
  assertEquals(await folderList.execute({ cursor: "c", pageSize: 30 }, ctx), page);
  assertEquals(pathOf(calls[0].url), "/v1/folders");
  assertEquals(queryOf(calls[0].url), { cursor: "c", page_size: "30" });
});

Deno.test("folder-list: 401 surfaces the vendor code", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "INVALID_API_KEY", message: "bad" } }]);
  await assertRejects(async () => await folderList.execute({}, ctx), Error, "INVALID_API_KEY");
});
