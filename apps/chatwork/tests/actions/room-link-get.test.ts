import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import roomLinkGet from "../../actions/room-link-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("room-link-get: calls GET /rooms/{room_id}/link", async () => {
  const link = { public: true, url: "https://www.chatwork.com/g/abc123", need_acceptance: true };
  const { ctx, calls } = mockCtx([{ body: link }]);
  const out = await roomLinkGet.execute({ roomId: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/link");
  assertEquals(out, link);
});

test("room-link-get: public false means no link exists", async () => {
  const { ctx } = mockCtx([{ body: { public: false } }]);
  const out = await roomLinkGet.execute({ roomId: "5" }, ctx) as { public: boolean };
  assertEquals(out.public, false);
});
