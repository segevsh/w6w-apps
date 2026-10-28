import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-reaction.ts";

Deno.test("create-reaction: POSTs to spaces/{space}/messages/{message}/reactions", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/A1/messages/B1/reactions/R1" } }]);
  await action.execute!({ space: "A1", message: "B1.B1", emoji: "👍" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/messages/B1.B1/reactions");
  assertEquals(JSON.parse(calls[0].body!), { emoji: { unicode: "👍" } });
});

Deno.test("create-reaction: a custom emoji is sent as emoji.customEmoji.uid", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", message: "B1", customEmoji: "uid-123" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { emoji: { customEmoji: { uid: "uid-123" } } });
});

Deno.test("create-reaction: a full message resource name overrides the space field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "IGNORED", message: "spaces/A9/messages/B9", emoji: "🎉" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A9/messages/B9/reactions");
});

Deno.test("create-reaction: refuses a request with neither emoji form", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ space: "A1", message: "B1" }, ctx),
    Error,
    "either a Unicode emoji or a custom emoji uid",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-reaction: refuses a request carrying both emoji forms", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await action.execute!(
        { space: "A1", message: "B1", emoji: "👍", customEmoji: "u" },
        ctx,
      ),
    Error,
    "either a Unicode emoji or a custom one",
  );
  assertEquals(calls.length, 0);
});
