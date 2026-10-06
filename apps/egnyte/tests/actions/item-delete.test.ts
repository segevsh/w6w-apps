import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/item-delete.ts";

Deno.test("item-delete: DELETEs the path", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { parent_folder_path: "/Shared" } }]);
  assertEquals(await action.execute({ path: "/Shared/a.txt" }, ctx), { success: true });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/Shared/a.txt");
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("item-delete: a version entry id becomes entry_id", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }]);
  await action.execute({ path: "a.txt", entryId: "e1" }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/a.txt?entry_id=e1");
});
