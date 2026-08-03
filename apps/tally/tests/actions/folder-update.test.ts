import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/folder-update.ts";

Deno.test("folder-update: PATCHes the folder's name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "f1", name: "Renamed" } }]);
  const result = await action.execute({ workspaceId: "w1", folderId: "f1", name: "Renamed" }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/workspaces/w1/folders/f1");
  assertEquals(jsonBody(calls[0]), { name: "Renamed" });
  assertEquals(result.name, "Renamed");
});
