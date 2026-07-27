import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-create.ts";

Deno.test("list-create: POSTs to /folder/{id}/list when a folder is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1" } }]);
  await action.execute!({ folderId: "f1", name: "Backlog", priority: 3 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/folder/f1/list");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Backlog");
  assertEquals(body.priority, 3);
});

Deno.test("list-create: POSTs to /space/{id}/list for a folderless list", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l2" } }]);
  await action.execute!({ spaceId: "s1", name: "Inbox" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/space/s1/list");
});

Deno.test("list-create: rejects when neither folder nor space is supplied", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ name: "x" }, ctx),
    Error,
    "Folder ID or a Space ID",
  );
});
