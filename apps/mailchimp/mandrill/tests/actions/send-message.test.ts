import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-message.ts";

Deno.test("send-message: POSTs /messages/send.json with from/to/subject", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ email: "bob@x.com", status: "sent" }] }]);
  await action.execute!(
    {
      fromEmail: "ada@x.com",
      fromName: "Ada",
      to: "Bob <bob@x.com>",
      subject: "Hi",
      text: "Hello",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/messages/send.json");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.from_email, "ada@x.com");
  assertEquals(body.message.from_name, "Ada");
  assertEquals(body.message.to, [{ email: "bob@x.com", name: "Bob", type: "to" }]);
  assertEquals(body.message.subject, "Hi");
  assertEquals(body.message.text, "Hello");
  assertEquals(body.async, false);
});

Deno.test("send-message: merges to/cc/bcc into one tagged `to` array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    {
      fromEmail: "ada@x.com",
      to: "bob@x.com",
      cc: "cc@x.com",
      bcc: "bcc@x.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.to, [
    { email: "bob@x.com", type: "to" },
    { email: "cc@x.com", type: "cc" },
    { email: "bcc@x.com", type: "bcc" },
  ]);
});

Deno.test("send-message: normalizes tags and converts global merge vars from an object map", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    {
      fromEmail: "ada@x.com",
      to: "bob@x.com",
      subject: "Hi",
      tags: "welcome, vip",
      globalMergeVars: { FNAME: "Bob" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.tags, ["welcome", "vip"]);
  assertEquals(body.message.global_merge_vars, [{ name: "FNAME", content: "Bob" }]);
});

Deno.test("send-message: forwards optional flags, headers, attachments, subaccount, scheduling", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    {
      fromEmail: "ada@x.com",
      to: "bob@x.com",
      subject: "Hi",
      important: true,
      trackOpens: true,
      trackClicks: false,
      headers: { "X-Custom": "1" },
      attachments: [{ type: "text/plain", name: "f.txt", content: "aGk=" }],
      subaccount: "sub1",
      async: true,
      ipPool: "Main Pool",
      sendAt: "2026-08-03 00:00:00",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.important, true);
  assertEquals(body.message.track_opens, true);
  assertEquals(body.message.track_clicks, false);
  assertEquals(body.message.headers, { "X-Custom": "1" });
  assertEquals(body.message.attachments, [{ type: "text/plain", name: "f.txt", content: "aGk=" }]);
  assertEquals(body.message.subaccount, "sub1");
  assertEquals(body.async, true);
  assertEquals(body.ip_pool, "Main Pool");
  assertEquals(body.send_at, "2026-08-03 00:00:00");
});
