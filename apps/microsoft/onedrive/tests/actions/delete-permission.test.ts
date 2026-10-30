import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-permission.ts";

test("delete-permission: DELETEs one grant and reports 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ itemId: "01ABC", permissionId: "perm1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/01ABC/permissions/perm1",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

test("delete-permission: encodes a permission id that needs it", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ itemId: "i", permissionId: "aTh#b/c" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/i/permissions/aTh%23b%2Fc",
  );
});

test("delete-permission: works from a path-addressed item", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ itemPath: "Reports/Q3.pdf", permissionId: "p" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root:/Reports/Q3.pdf:/permissions/p",
  );
});

test("delete-permission: passes if-match through", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ itemId: "i", permissionId: "p", ifMatch: '"e"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"e"');
});

test("delete-permission: requires an item", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({ permissionId: "p" }, ctx) as Promise<unknown>,
    Error,
    "must be addressed",
  );
});

test("delete-permission: is idempotent — the end state is the same either way", () => {
  assertEquals(action.idempotent, true);
});
