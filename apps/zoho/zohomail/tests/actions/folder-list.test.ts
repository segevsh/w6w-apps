import { assertEquals } from "@std/assert";
import folderList from "../../actions/folder-list.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("folder-list: fetches folders under the account", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope([{ folderId: "f1", folderName: "Inbox" }]) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await folderList.execute({}, ctx) as unknown as Record<string, unknown>[];

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/folders");
  assertEquals(out, [{ folderId: "f1", folderName: "Inbox" }]);
});

Deno.test("folder-list: returns an empty array when the envelope carries no data", async () => {
  const { ctx } = mockCtx(
    [{ body: { status: { code: 200, description: "success" } } }],
    usConnection(),
  );
  assertEquals(await folderList.execute({}, ctx), []);
});
