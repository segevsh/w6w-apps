import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-reply.ts";

Deno.test("add-reply: POSTs /conversations/{id}/reply and reads the id off Resource-ID", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: { "resource-id": "567" } }]);
  const out = await action.execute({
    conversationId: 123,
    customerId: 100,
    text: "How are you?",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conversations/123/reply");
  assertEquals(JSON.parse(calls[0].body!), {
    customer: { id: 100 },
    text: "How are you?",
    draft: false,
  });
  assertEquals(out, { id: 567 });
});

Deno.test("add-reply: draft/status/cc/bcc are forwarded when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: {} }]);
  await action.execute({
    conversationId: 1,
    customerId: 2,
    text: "hi",
    draft: true,
    status: "closed",
    cc: "a@b.c, d@e.f",
    bcc: "z@z.z",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.draft, true);
  assertEquals(body.status, "closed");
  assertEquals(body.cc, ["a@b.c", "d@e.f"]);
  assertEquals(body.bcc, ["z@z.z"]);
});
