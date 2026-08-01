import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-folder.ts";

Deno.test("delete-folder: DELETEs /folders/{id} with recursive=false by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ folderId: "42" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/folders/42");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.searchParams.get("recursive"), "false");
  assertEquals(result, { success: true, folderId: "42" });
});

Deno.test("delete-folder: forwards recursive=true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute!({ folderId: "42", recursive: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("recursive"), "true");
});
