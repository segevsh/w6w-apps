import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-delete.ts";

Deno.test("folder-delete: DELETEs the folder and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ workspaceId: "w1", folderId: "f1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1/folders/f1");
  assertEquals(result, { folderId: "f1", deleted: true });
});
