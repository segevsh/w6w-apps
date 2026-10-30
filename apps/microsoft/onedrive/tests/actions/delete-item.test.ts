import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-item.ts";

test("delete-item: DELETEs the item and reports 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ itemId: "01ABC" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/01ABC");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { status: 204 });
});

test("delete-item: deletes the item addressed by path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ itemPath: "Reports/Q3.pdf" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/root:/Reports/Q3.pdf",
  );
});

test("delete-item: sends no prefer header unless a bypass is requested", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ itemId: "i" }, ctx);
  assertEquals(calls[0].headers["prefer"], undefined);
});

test("delete-item: combines both bypasses into one comma-separated header", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ itemId: "i", bypassSharedLock: true, bypassCheckedOut: true }, ctx);
  assertEquals(calls[0].headers["prefer"], "bypass-shared-lock, bypass-checked-out");
});

test("delete-item: passes if-match through", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ itemId: "i", ifMatch: '"e"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"e"');
});

test("delete-item: refuses to delete a whole drive root by default", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => action.execute({}, ctx) as Promise<unknown>,
    Error,
    "must be addressed",
  );
});

test("delete-item: is idempotent — the end state is the same either way", () => {
  assertEquals(action.idempotent, true);
});
