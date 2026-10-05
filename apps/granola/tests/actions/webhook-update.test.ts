import { assertEquals, assertRejects } from "@std/assert";
import webhookUpdate from "../../actions/webhook-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const ID = "whe_abcdefghij1234";

Deno.test("webhook-update: PATCHes only the fields supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: ID, enabled: false } }]);
  await webhookUpdate.execute({ webhookEndpointId: ID, enabled: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v1/webhook-endpoints/" + ID);
  assertEquals(JSON.parse(calls[0].body!), { enabled: false });
});

Deno.test("webhook-update: replaces scopes, events and folders", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookUpdate.execute({
    webhookEndpointId: ID,
    url: "https://e.com/new",
    scopes: ["public"],
    events: ["note.edited"],
    folderIds: ["fol_a"],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://e.com/new",
    scopes: ["public"],
    events: ["note.edited"],
    folder_ids: ["fol_a"],
  });
});

Deno.test("webhook-update: clearFolderFilter sends an empty folder_ids array", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await webhookUpdate.execute(
    { webhookEndpointId: ID, clearFolderFilter: true, folderIds: "fol_a" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { folder_ids: [] });
});

Deno.test("webhook-update: 403 surfaces", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { code: "FORBIDDEN", message: "scope disabled" },
  }]);
  await assertRejects(
    async () => await webhookUpdate.execute({ webhookEndpointId: ID, scopes: ["public"] }, ctx),
    Error,
    "scope disabled",
  );
});
