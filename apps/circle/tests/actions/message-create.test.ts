import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/message-create.ts";

/**
 * The schema's `oneOf` is `{user_email, rich_text_body}` OR
 * `{user_emails, rich_text_body}` — singular and plural are different
 * properties, because one address is a DM and a list is a group chat room.
 */
Deno.test("message-create: one recipient sends the SINGULAR user_email", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ recipients: "alice@example.com", text: "Hi" }, ctx);
  assertEquals(calls[0].url, `${API}/messages`);
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.user_email, "alice@example.com");
  assertEquals(body.user_emails, undefined);
});

Deno.test("message-create: two or more recipients send the PLURAL user_emails", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ recipients: "a@x.com, b@x.com ", text: "Hi" }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.user_emails, ["a@x.com", "b@x.com"]);
  assertEquals(body.user_email, undefined);
});

Deno.test("message-create: the body property is rich_text_body, not tiptap_body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ recipients: "a@x.com", text: "Hello" }, ctx);
  assertEquals(bodyOf(calls[0]).rich_text_body, {
    body: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
    },
  });
});

Deno.test("message-create: a wrapped document keeps its attachment sidecar", async () => {
  // The only way to send a signed upload id — `resolveBody` must not strip it.
  const doc = { body: { type: "doc", content: [] }, attachments: ["eyJfcmFpbHMi"] };
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ recipients: "a@x.com", bodyJson: doc }, ctx);
  assertEquals(bodyOf(calls[0]).rich_text_body, doc);
});

Deno.test("message-create: a recipients field with no address is rejected before the call", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({ recipients: " , ", text: "hi" }, ctx);
    },
    Error,
    "recipient",
  );
  assertEquals(calls.length, 0);
});

Deno.test("message-create: is not idempotent — a message is an event", () => {
  assertEquals(action.idempotent, false);
  assert(/group chat/i.test(action.description!));
});
