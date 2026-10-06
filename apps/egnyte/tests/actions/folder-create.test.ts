import { assertEquals } from "@std/assert";
import { mockEgnyteCtx } from "../_helpers.ts";
import action from "../../actions/folder-create.ts";

Deno.test("folder-create: POSTs add_folder to the path", async () => {
  const { ctx, calls } = mockEgnyteCtx([{
    status: 201,
    body: { path: "/Shared/t", folder_id: "f" },
  }]);
  const out = await action.execute({ path: "/Shared/t" }, ctx);
  assertEquals(calls[0].url, "https://acme.egnyte.com/pubapi/v1/fs/Shared/t");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { action: "add_folder" });
  assertEquals(out, { path: "/Shared/t", folder_id: "f" });
});
