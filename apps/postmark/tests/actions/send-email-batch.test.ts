import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-email-batch.ts";

Deno.test("send-email-batch: POSTs /email/batch with the raw messages array", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{ ErrorCode: 0, Message: "OK", MessageID: "a" }, { ErrorCode: 300, Message: "bad" }],
  }]);
  const messages = [
    { From: "ada@x.com", To: "bob@x.com", Subject: "Hi", TextBody: "1" },
    { From: "ada@x.com", To: "not-an-email", Subject: "Hi", TextBody: "2" },
  ];
  const out = await action.execute({ messages }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/email/batch");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), messages);
  assertEquals(out.length, 2);
  assertEquals(out[1].ErrorCode, 300);
});

Deno.test("send-email-batch: throws on an empty or missing messages array", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ messages: [] }, ctx)),
    Error,
    "messages",
  );
  await assertRejects(
    () => Promise.resolve(action.execute({} as unknown as { messages: never[] }, ctx)),
    Error,
    "messages",
  );
});
