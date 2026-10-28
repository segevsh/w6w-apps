import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-message.ts";

Deno.test("update-message: PATCHes the message with updateMask pinned to text", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", message: "B1.B1", text: "edited" }, ctx);
  assertEquals(calls[0].method, "PATCH");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/spaces/A1/messages/B1.B1");
  // `cards` / `cards_v2` / `accessory_widgets` need app auth, so `text` is the
  // only field path a user credential can write.
  assertEquals(url.searchParams.get("updateMask"), "text");
  assertEquals(JSON.parse(calls[0].body!), { text: "edited" });
});

Deno.test("update-message: a full message resource name overrides the space field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "IGNORED", message: "spaces/A9/messages/B9", text: "t" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A9/messages/B9");
});

Deno.test("update-message: allowMissing is sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute!({ space: "A1", message: "client-x", text: "t", allowMissing: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("allowMissing"), "true");
  await action.execute!({ space: "A1", message: "client-x", text: "t" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("allowMissing"), false);
});
