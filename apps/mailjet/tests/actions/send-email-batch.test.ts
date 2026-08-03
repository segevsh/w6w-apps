import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-email-batch.ts";

const OK = { body: { Messages: [{ Status: "success" }, { Status: "success" }] } };

Deno.test("send-email-batch: passes the Messages array through verbatim", async () => {
  const { ctx, calls } = mockCtx([OK]);
  const messages = [
    { From: { Email: "a@x.com" }, To: [{ Email: "b@x.com" }], Subject: "1", TextPart: "one" },
    { From: { Email: "a@x.com" }, To: [{ Email: "c@x.com" }], Subject: "2", TextPart: "two" },
  ];
  await action.execute!({ messages }, ctx);
  assertEquals(calls[0].url, "https://api.mailjet.com/v3.1/send");
  assertEquals(JSON.parse(calls[0].body!).Messages, messages);
});

Deno.test("send-email-batch: does not reorder, filter or reshape the caller's array", async () => {
  // Response order is the only way to attribute a partial failure, so the
  // request order has to be preserved exactly.
  const { ctx, calls } = mockCtx([OK]);
  const messages = [
    { Subject: "z", To: [{ Email: "z@x.com" }] },
    { Subject: "a", To: [{ Email: "a@x.com" }] },
  ];
  await action.execute!({ messages }, ctx);
  const sent = JSON.parse(calls[0].body!).Messages;
  assertEquals(sent.map((m: { Subject: string }) => m.Subject), ["z", "a"]);
});

Deno.test("send-email-batch: does not cap the batch — Mailjet enforces its own 50 limit", async () => {
  const { ctx, calls } = mockCtx([{ body: { Messages: [] } }]);
  const messages = Array.from({ length: 60 }, (_, i) => ({ Subject: `m${i}` }));
  await action.execute!({ messages }, ctx);
  assertEquals(JSON.parse(calls[0].body!).Messages.length, 60);
});

Deno.test("send-email-batch: sandbox mode rides on the envelope", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ messages: [{ Subject: "x" }], sandboxMode: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.SandboxMode, true);
  assert(!("SandboxMode" in body.Messages[0]));
});

Deno.test("send-email-batch: surfaces a mixed success/error response as-is", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      Messages: [
        { Status: "error", Errors: [{ ErrorCode: "send-0003" }] },
        { Status: "success", To: [{ MessageID: 2 }] },
      ],
    },
  }]);
  const result = await action.execute!({ messages: [{}, {}] }, ctx) as {
    Messages: Array<{ Status: string }>;
  };
  assertEquals(result.Messages.map((m) => m.Status), ["error", "success"]);
});
