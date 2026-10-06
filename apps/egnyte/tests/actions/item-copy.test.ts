import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/item-copy.ts";

Deno.test("item-copy: POSTs the action with destination and omits unset options", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: { path: "/B/x", group_id: "g" } }]);
  const out = await action.execute({ path: "/A/x", destination: "/B/x" }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/A/x");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { action: "copy", destination: "/B/x" });
  assertEquals(out, { path: "/B/x", group_id: "g" });
});

Deno.test("item-copy: forwards permissions and folder options mode", async () => {
  const { ctx, calls } = mockEgnyteCtx([{ body: {} }]);
  await action.execute(
    {
      path: "A",
      destination: "/B",
      permissions: "inherit_from_parent",
      folderOptionsMode: "keep_source",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    action: "copy",
    destination: "/B",
    permissions: "inherit_from_parent",
    folder_options_mode: "keep_source",
  });
});
