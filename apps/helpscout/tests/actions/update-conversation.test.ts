import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-conversation.ts";

Deno.test("update-conversation: subject sends a replace op with a string value", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute(
    { conversationId: 123, field: "subject", value: "New subject" },
    ctx,
  );
  assertEquals(out, { success: true });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conversations/123");
  assertEquals(JSON.parse(calls[0].body!), {
    op: "replace",
    path: "/subject",
    value: "New subject",
  });
});

Deno.test("update-conversation: assignTo coerces value to a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ conversationId: 1, field: "assignTo", value: "234" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { op: "replace", path: "/assignTo", value: 234 });
});

Deno.test("update-conversation: unassign sends a remove op with no value", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ conversationId: 1, field: "unassign" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { op: "remove", path: "/assignTo" });
  assertEquals("value" in body, false);
});

Deno.test("update-conversation: mailboxId uses Help Scout's `move` op", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ conversationId: 1, field: "mailboxId", value: "85" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { op: "move", path: "/mailboxId", value: 85 });
});

Deno.test("update-conversation: customerId maps to /primaryCustomer.id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ conversationId: 1, field: "customerId", value: "500" }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!),
    { op: "replace", path: "/primaryCustomer.id", value: 500 },
  );
});

Deno.test("update-conversation: publishDraft always sends value true", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ conversationId: 1, field: "publishDraft" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { op: "replace", path: "/draft", value: true });
});

Deno.test("update-conversation: rejects an unknown field", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute({ conversationId: 1, field: "nope" }, ctx),
    Error,
    'unknown field "nope"',
  );
});
