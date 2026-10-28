import { assertEquals } from "@std/assert";
import messageSend from "../../actions/message-send.ts";
import { envelope, mockCtx, pathOf, usConnection } from "../_helpers.ts";

Deno.test("message-send: POSTs the compacted message body", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ messageId: "m1", subject: "Hello" }) }],
    usConnection({ accountId: "acc-1" }),
  );
  const out = await messageSend.execute(
    {
      fromAddress: "rebecca@zylker.com",
      toAddress: "paula@zylker.com",
      subject: "Hello",
      content: "Body",
      askReceipt: "yes",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/accounts/acc-1/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    fromAddress: "rebecca@zylker.com",
    toAddress: "paula@zylker.com",
    subject: "Hello",
    content: "Body",
    askReceipt: "yes",
  });
  assertEquals(out, { messageId: "m1", subject: "Hello" });
});

Deno.test("message-send: passes scheduling fields through when set", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: envelope({ messageId: "m2", subject: "Later" }) }],
    usConnection(),
  );
  await messageSend.execute(
    {
      fromAddress: "rebecca@zylker.com",
      toAddress: "paula@zylker.com",
      isSchedule: true,
      scheduleType: 6,
      timeZone: "Asia/Calcutta",
      scheduleTime: "09/15/2026 14:30:28",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.isSchedule, true);
  assertEquals(body.scheduleType, 6);
  assertEquals(body.timeZone, "Asia/Calcutta");
  assertEquals(body.scheduleTime, "09/15/2026 14:30:28");
});

Deno.test("message-send: is not idempotent — retrying would send a second email", () => {
  assertEquals(messageSend.idempotent, false);
});
