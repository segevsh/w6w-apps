import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  BASE_URL,
  compact,
  csv,
  parseComponents,
  phoneNumberIdFromConnection,
  unset,
  wabaIdFromConnection,
  WhatsAppClient,
} from "../../lib/client.ts";

Deno.test("client: BASE_URL is pinned to the documented Graph API version", () => {
  assertEquals(BASE_URL, "https://graph.facebook.com/v23.0");
});

Deno.test("client: sendMessage POSTs to /{phoneNumberId}/messages with the whatsapp envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { messaging_product: "whatsapp", messages: [{ id: "wamid.1" }] },
  }]);
  const out = await new WhatsAppClient(ctx).sendMessage({
    to: "15551234567",
    type: "text",
    text: { body: "hi" },
  });
  assertEquals(out, { messaging_product: "whatsapp", messages: [{ id: "wamid.1" }] });
  assertEquals(calls[0].url, "https://graph.facebook.com/v23.0/1234567890/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    messaging_product: "whatsapp",
    to: "15551234567",
    type: "text",
    text: { body: "hi" },
  });
});

Deno.test("client: sendMessage drops keys left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { messaging_product: "whatsapp" } }]);
  await new WhatsAppClient(ctx).sendMessage({
    to: "1",
    type: "text",
    text: { body: "hi" },
    extra: undefined,
  });
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body).sort(), ["messaging_product", "text", "to", "type"]);
});

Deno.test("client: sets no Authorization header (credentials belong to `sign`)", async () => {
  const { ctx, calls } = mockCtx([{ body: { messaging_product: "whatsapp" } }]);
  await new WhatsAppClient(ctx).sendMessage({ to: "1", type: "text" });
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: markRead posts a status=read envelope with the message id", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await new WhatsAppClient(ctx).markRead("wamid.HBg");
  assertEquals(out, { success: true });
  assertEquals(JSON.parse(calls[0].body!), {
    messaging_product: "whatsapp",
    status: "read",
    message_id: "wamid.HBg",
  });
});

Deno.test("client: listTemplates GETs /{wabaId}/message_templates with fields + query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new WhatsAppClient(ctx).listTemplates({ name: "hello_world", limit: 10 });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/9876543210/message_templates");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("fields"), "name,status,category,language,components");
  assertEquals(url.searchParams.get("name"), "hello_world");
  assertEquals(url.searchParams.get("limit"), "10");
});

Deno.test("client: listTemplates throws a clear error when the connection has no wabaId", async () => {
  const { ctx } = mockCtx([], { display: { phoneNumberId: "1" } } as never);
  await assertRejects(
    async () => {
      await new WhatsAppClient(ctx).listTemplates();
    },
    Error,
    "no wabaId on record",
  );
});

Deno.test("client: getBusinessProfile GETs /{phoneNumberId}/whatsapp_business_profile", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ about: "Hi" }] } }]);
  const out = await new WhatsAppClient(ctx).getBusinessProfile();
  assertEquals(out, { data: [{ about: "Hi" }] });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/1234567890/whatsapp_business_profile");
  assertEquals(
    url.searchParams.get("fields"),
    "about,address,description,email,profile_picture_url,websites,vertical",
  );
});

Deno.test("client: updateBusinessProfile POSTs only the compacted fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new WhatsAppClient(ctx).updateBusinessProfile({ about: "Hi", address: undefined });
  assertEquals(JSON.parse(calls[0].body!), { messaging_product: "whatsapp", about: "Hi" });
});

Deno.test("client: surfaces the Graph API error envelope on failure", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error: { message: "Invalid parameter", code: 100 } } },
  ]);
  await assertRejects(
    () => new WhatsAppClient(ctx).sendMessage({ to: "1", type: "text" }),
    Error,
    "WhatsApp 100 for POST /v23.0/1234567890/messages: Invalid parameter",
  );
});

Deno.test("client: surfaces a non-JSON response rather than swallowing it", async () => {
  const { ctx } = mockCtx([{ status: 502, statusText: "Bad Gateway", body: "<html>nope</html>" }]);
  await assertRejects(
    () => new WhatsAppClient(ctx).sendMessage({ to: "1", type: "text" }),
    Error,
    "non-JSON response",
  );
});

Deno.test("client: phoneNumberIdFromConnection throws a clear error when unset", () => {
  assertThrows(
    () => phoneNumberIdFromConnection(undefined),
    Error,
    "no phoneNumberId",
  );
});

Deno.test("client: wabaIdFromConnection throws a clear error when unset", () => {
  assertThrows(
    () => wabaIdFromConnection({ display: {} } as never),
    Error,
    "no wabaId",
  );
});

Deno.test("client: compact drops only unset values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false }), {
    a: 1,
    d: "",
    e: false,
  });
});

Deno.test("client: unset() maps a blank form field to absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset(undefined), undefined);
  assertEquals(unset("hi"), "hi");
});

Deno.test("client: csv() splits and trims, or leaves absent", () => {
  assertEquals(csv("https://a.com, https://b.com"), ["https://a.com", "https://b.com"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
});

Deno.test("client: parseComponents accepts an array, a JSON string, or absence", () => {
  const arr = [{ type: "body", parameters: [] }];
  assertEquals(parseComponents(arr), arr);
  assertEquals(parseComponents(JSON.stringify(arr)), arr);
  assertEquals(parseComponents(undefined), undefined);
  assertEquals(parseComponents(""), undefined);
});

Deno.test("client: parseComponents rejects a non-array JSON value", () => {
  assertThrows(() => parseComponents({ not: "an array" }), Error, "must be a JSON array");
});
