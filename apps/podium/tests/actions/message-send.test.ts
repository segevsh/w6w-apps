import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import messageSend from "../../actions/message-send.ts";

Deno.test("message-send: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await messageSend.execute({
    "body": "body text",
    "locationUid": "locationUid-1",
    "channelType": "phone",
    "channelIdentifier": "channelIdentifier-1",
    "contactName": "contactName-1",
    "senderName": "senderName-1",
    "subject": "subject-1",
    "setOpenInbox": true,
  } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/messages");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "body": "body text",
    "locationUid": "locationUid-1",
    "channel": { "type": "phone", "identifier": "channelIdentifier-1" },
    "contactName": "contactName-1",
    "senderName": "senderName-1",
    "subject": "subject-1",
    "setOpenInbox": true,
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("message-send: a minimal call sends only what was set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await messageSend.execute(
    {
      "body": "body text",
      "locationUid": "locationUid-1",
      "channelType": "phone",
      "channelIdentifier": "channelIdentifier-1",
    } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/messages");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "body": "body text",
    "locationUid": "locationUid-1",
    "channel": { "type": "phone", "identifier": "channelIdentifier-1" },
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("message-send: declares its params and kind", () => {
  assertEquals((messageSend.params ?? []).map((p) => p.key), [
    "body",
    "locationUid",
    "channelType",
    "channelIdentifier",
    "contactName",
    "senderName",
    "subject",
    "setOpenInbox",
  ]);
  assertEquals((messageSend.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "body",
    "locationUid",
    "channelType",
    "channelIdentifier",
  ]);
  assertEquals(messageSend.type, "perform");
  assertEquals(messageSend.idempotent, false);
});
