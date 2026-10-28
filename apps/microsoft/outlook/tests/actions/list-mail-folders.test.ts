import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-mail-folders.ts";

Deno.test("list-mail-folders: GETs the mailbox root by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "f1", displayName: "Inbox" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/mailFolders");
  assertEquals(out.value.length, 1);
});

Deno.test("list-mail-folders: switches to childFolders when a parent is named", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ parentFolderId: "inbox" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/mailFolders/inbox/childFolders");
});

Deno.test("list-mail-folders: includeHiddenFolders is not an OData `$` parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ includeHiddenFolders: true }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("includeHiddenFolders"), "true");
  assertEquals(params.get("$includeHiddenFolders"), null);
});

Deno.test("list-mail-folders: omits includeHiddenFolders when off", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ includeHiddenFolders: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeHiddenFolders"), null);
});

Deno.test("list-mail-folders: walks every page when asked", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/mailFolders?$skip=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});
