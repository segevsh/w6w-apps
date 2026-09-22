import { assertEquals } from "@std/assert";
import loggedTimeUpdate from "../../actions/logged-time-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("logged-time-update: PUTs the corrected fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 555 } }]);
  await loggedTimeUpdate.execute({ loggedTimeId: 555, minutes: 120, notes: "Corrected" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/logged_times/555");
  assertEquals(bodyOf(calls[0]), { minutes: 120, notes: "Corrected" });
});

Deno.test("logged-time-update: private=false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 555 } }]);
  await loggedTimeUpdate.execute({ loggedTimeId: 555, private: false }, ctx);
  assertEquals(bodyOf(calls[0]), { private: false });
});
