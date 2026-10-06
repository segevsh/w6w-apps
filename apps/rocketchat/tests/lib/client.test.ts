import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  apiHost,
  compact,
  errorMessage,
  jsonValue,
  normalizeWorkspace,
  requireRoom,
  resolveApiUrl,
  RocketChatClient,
} from "../../lib/client.ts";
import { BASE, mockCtx, rcError } from "../_helpers.ts";

Deno.test("normalizeWorkspace: accepts a label, a host or a URL", () => {
  for (const raw of ["acme", " ACME ", "acme.rocket.chat", "https://acme.rocket.chat/home?x=1"]) {
    assertEquals(normalizeWorkspace(raw), "acme", raw);
  }
});

Deno.test("apiHost: builds <label>.rocket.chat and refuses anything else", () => {
  assertEquals(apiHost("acme"), "acme.rocket.chat");
  assertThrows(() => apiHost(""), Error, "missing a workspace");
  assertThrows(() => apiHost("chat.example.com"), Error, "not a Rocket.Chat Cloud workspace");
  assertThrows(() => apiHost("a b"), Error);
  assertThrows(() => apiHost("evil.com#x.rocket.chat"), Error);
  assertEquals(resolveApiUrl({ workspace: "acme" }), BASE);
});

Deno.test("client: sends accept JSON, drops empty query values and sets content-type on a body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }, { body: { success: true } }]);
  const c = new RocketChatClient(ctx);
  await c.request("/channels.list", { query: { count: 5, offset: undefined, sort: "", a: null } });
  await c.request("/chat.react", { method: "POST", body: { emoji: ":x:" } });
  assertEquals(calls[0].url, `${BASE}/channels.list?count=5`);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, '{"emoji":":x:"}');
});

Deno.test("client: a 4xx throws with the vendor's error text", async () => {
  const { ctx } = mockCtx([rcError("[error-invalid-room]")]);
  const err = await assertRejects(() => new RocketChatClient(ctx).request("/channels.info"));
  assert(String(err).includes("400") && String(err).includes("[error-invalid-room]"));
});

Deno.test("client: a 401 reads the `message` field of the unauthenticated envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { success: false, status: "error", message: "You must be logged in to do this." },
  }]);
  const err = await assertRejects(() => new RocketChatClient(ctx).request("/me"));
  assert(String(err).includes("You must be logged in"));
});

Deno.test("client: a 200 carrying success:false is still an error", async () => {
  const { ctx } = mockCtx([{ body: { success: false, error: "boom" } }]);
  await assertRejects(() => new RocketChatClient(ctx).request("/me"), Error, "boom");
});

Deno.test("client: a non-JSON body is an error, and no connection means no call", async () => {
  const html = mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(() => new RocketChatClient(html.ctx).request("/me"), Error, "non-JSON");
  const none = mockCtx([], { display: null });
  await assertRejects(() => new RocketChatClient(none.ctx).request("/me"), Error, "workspace");
  assertEquals(none.calls.length, 0);
});

Deno.test("helpers: compact, jsonValue, errorMessage, requireRoom", () => {
  assertEquals(compact({ a: 1, b: undefined, c: "", d: null, e: false }), { a: 1, e: false });
  assertEquals(jsonValue('{"a":1}', "x"), { a: 1 });
  assertEquals(jsonValue([1], "x"), [1]);
  assertEquals(jsonValue("", "x"), undefined);
  assertThrows(() => jsonValue("{", "attachments"), Error, "`attachments` must be valid JSON");
  assertEquals(errorMessage({ error: "e", message: "m" }), "e");
  assertEquals(errorMessage({ message: "m" }), "m");
  assertEquals(errorMessage(null), "");
  assertThrows(() => requireRoom({}), Error, "Room ID or a Room name");
  requireRoom({ roomName: "general" });
});
