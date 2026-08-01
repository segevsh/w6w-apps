import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-folder.ts";

Deno.test("get-folder: GETs /folders/{id}", async () => {
  const folder = { id: "0", type: "folder", name: "All Files" };
  const { ctx, calls } = mockCtx([{ body: folder }]);
  const result = await action.execute!({ folderId: "0" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/folders/0");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, folder);
});
