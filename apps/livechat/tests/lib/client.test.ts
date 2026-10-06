import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  actionUrl,
  asList,
  compact,
  describeError,
  errorOf,
  LiveChatClient,
  optEnum,
  optInt,
  optIntList,
  optObject,
  optStringList,
  pageInfo,
  pagingBody,
  requireString,
} from "../../lib/client.ts";
import { mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("client: builds the RPC url for both surfaces", () => {
  assertEquals(
    actionUrl("agent", "list_chats"),
    "https://api.livechatinc.com/v3.6/agent/action/list_chats",
  );
  assertEquals(
    actionUrl("configuration", "list_tags"),
    "https://api.livechatinc.com/v3.6/configuration/action/list_tags",
  );
});

Deno.test("client: every call is a JSON POST with the body and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  const out = await new LiveChatClient(ctx).agent("get_chat", { chat_id: "C1" });
  assertEquals(out, { ok: 1 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "C1" });
});

Deno.test("client: an empty 200 body (no response payload) is {}", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new LiveChatClient(ctx).agent("tag_thread", {}), {});
});

Deno.test("client: an error envelope throws, classified from the body not the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: unauthorized }]);
  await assertRejects(
    () => new LiveChatClient(ctx).agent("list_chats"),
    Error,
    "authentication: No `Authorization` header",
  );
  // The same envelope on a 200 is still an error.
  const again = mockCtx([{ status: 200, body: unauthorized }]);
  await assertRejects(
    () => new LiveChatClient(again.ctx).agent("list_chats"),
    Error,
    "authentication",
  );
});

Deno.test("client: misdirected_request names the correct region", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      error: { type: "misdirected_request", message: "Wrong region", data: { region: "dal" } },
    },
  }]);
  await assertRejects(
    () => new LiveChatClient(ctx).config("list_agents"),
    Error,
    "correct region: dal",
  );
});

Deno.test("client: a non-JSON body and a bare non-2xx both throw", async () => {
  const html = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  await assertRejects(() => new LiveChatClient(html.ctx).agent("x"), Error, "non-JSON body");
  const bare = mockCtx([{ status: 500, body: {} }]);
  await assertRejects(() => new LiveChatClient(bare.ctx).agent("x"), Error, "LiveChat 500");
});

Deno.test("client: errorOf / describeError", () => {
  assertEquals(errorOf([]), undefined);
  assertEquals(errorOf({ chats: [] }), undefined);
  assertEquals(errorOf({ error: "string" }), undefined);
  assertEquals(describeError({ type: "validation" }), "validation");
});

Deno.test("client: input helpers", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  assertEquals(requireString(" x ", "n"), "x");
  assertThrows(() => requireString("  ", "n"), Error, "`n` is required");
  assertEquals(optEnum(undefined, "n", ["a"] as const), undefined);
  assertThrows(() => optEnum("z", "n", ["a"] as const), Error, "must be one of");
  assertEquals(optInt("5", "n", 1, 10), 5);
  assertThrows(() => optInt(11, "n", 1, 10), Error, "from 1 to 10");
  assertThrows(() => optInt(1.5, "n", 1, 10), Error, "integer");
  assertEquals(optStringList("a, b,,c", "n"), ["a", "b", "c"]);
  assertEquals(optStringList([], "n"), undefined);
  assertThrows(() => optStringList(5, "n"), Error, "list of strings");
  assertEquals(optIntList("0,3", "n"), [0, 3]); // 0 is the default group — a real id
  assertThrows(() => optIntList("a", "n"), Error, "integers");
  assertEquals(optObject('{"a":1}', "n"), { a: 1 });
  assertThrows(() => optObject("[1]", "n"), Error, "JSON object");
  assertThrows(() => optObject("{", "n"), Error, "valid JSON");
  assertEquals(optObject("", "n"), undefined);
});

Deno.test("client: asList and pageInfo", () => {
  assertEquals(asList([1, 2]), { items: [1, 2], count: 2 });
  assertEquals(asList({ odd: true }), { items: [], count: 0, raw: { odd: true } });
  assertEquals(pageInfo({ next_page_id: "n", previous_page_id: "p" }), {
    nextPageId: "n",
    previousPageId: "p",
  });
  assertEquals(pageInfo({}), { nextPageId: undefined, previousPageId: undefined });
});

Deno.test("client: pagingBody sends filters on page one and page_id alone afterwards", () => {
  assertEquals(
    pagingBody({ limit: 5, sortOrder: "asc" }, { filters: { active: true } }),
    { filters: { active: true }, limit: 5, sort_order: "asc" },
  );
  assertEquals(pagingBody({ pageId: "abc" }, {}), { page_id: "abc" });
  for (const bad of [{ limit: 5 }, { sortOrder: "asc" }]) {
    assertThrows(() => pagingBody({ pageId: "abc", ...bad }, {}), Error, "cannot be combined");
  }
  assertThrows(
    () => pagingBody({ pageId: "abc" }, { filters: { active: true } }),
    Error,
    "cannot be combined",
  );
  assertThrows(() => pagingBody({ limit: 101 }, {}), Error, "from 1 to 100");
});
