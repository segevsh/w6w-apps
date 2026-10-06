import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/item-get-by-id.ts";

Deno.test("item-get-by-id: GETs /v1/fs/ids/<kind>/<id>", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { folder_id: "f1" } }, { body: {} }]);
  assertEquals(await action.execute({ kind: "folder", id: "f1" }, ctx), { folder_id: "f1" });
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/ids/folder/f1");
  await action.execute({ kind: "file", id: "g/1", listContent: false }, ctx);
  assertEquals(
    calls[1].url,
    "https://acme.egnyte.com/pubapi/v1/fs/ids/file/g%2F1?list_content=false",
  );
});
