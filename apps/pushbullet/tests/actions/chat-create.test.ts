import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import chatCreate from "../../actions/chat-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("chat-create: POSTs {email} to /v2/chats", async () => {
  const { ctx, calls } = mockCtx([
    { body: { iden: "c1", with: { email: "john@example.com", type: "user" } } },
  ]);
  const out = await chatCreate.execute({ email: "john@example.com" }, ctx) as {
    iden: string;
    with: { email: string };
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/chats");
  assertEquals(JSON.parse(calls[0].body!), { email: "john@example.com" });
  assertEquals(out.with.email, "john@example.com");
});

test("chat-create: is declared idempotent — the vendor documents get-or-create", () => {
  assertEquals(chatCreate.idempotent, true);
});
