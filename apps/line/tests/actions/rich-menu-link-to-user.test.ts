import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import richMenuLinkToUser from "../../actions/rich-menu-link-to-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("rich-menu-link-to-user: POSTs to /v2/bot/user/{userId}/richmenu/{richMenuId}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await richMenuLinkToUser.execute({ userId: "U1", richMenuId: "r1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/bot/user/U1/richmenu/r1");
});

test("rich-menu-link-to-user: requires both userId and richMenuId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await richMenuLinkToUser.execute({ userId: "", richMenuId: "r1" }, ctx),
    Error,
    "userId",
  );
  await assertRejects(
    async () => await richMenuLinkToUser.execute({ userId: "U1", richMenuId: "" }, ctx),
    Error,
    "richMenuId",
  );
  assertEquals(calls.length, 0);
});

test("rich-menu-link-to-user: is declared idempotent", () => {
  assertEquals(richMenuLinkToUser.idempotent, true);
});
