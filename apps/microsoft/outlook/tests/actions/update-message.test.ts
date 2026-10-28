import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-message.ts";

Deno.test("update-message: PATCHes only the properties supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "m1", isRead: true } }]);
  const out = await action.execute({ messageId: "m1", isRead: true }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/m1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { isRead: true });
  assertEquals((out as { isRead: boolean }).isRead, true);
});

Deno.test("update-message: marking unread sends false rather than omitting the key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ messageId: "m1", isRead: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { isRead: false });
});

Deno.test("update-message: nests the flag under Graph's followupFlag shape", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ messageId: "m1", flagStatus: "flagged" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { flag: { flagStatus: "flagged" } });
});

Deno.test("update-message: carries categories, importance and focus", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    messageId: "m1",
    categories: ["Red category"],
    importance: "high",
    inferenceClassification: "focused",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    categories: ["Red category"],
    importance: "high",
    inferenceClassification: "focused",
  });
});

Deno.test("update-message: refuses a no-op PATCH", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ messageId: "m1" }, ctx),
    Error,
    "at least one property",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-message: exposes only the properties updatable on a sent message", () => {
  const keys = action.params!.map((p) => p.key).filter((k) => k !== "messageId");
  // Draft-only properties (subject, body, toRecipients, …) are deliberately absent.
  assertEquals(keys.sort(), [
    "categories",
    "flagStatus",
    "importance",
    "inferenceClassification",
    "isRead",
  ]);
});

Deno.test("update-message: is idempotent — the PATCH converges", () => {
  assertEquals(action.idempotent, true);
});
