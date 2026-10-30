import { test } from "node:test";
import { assert, assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  GoogleChatClient,
  membershipName,
  messageName,
  reactionName,
  spaceName,
  threadName,
  userName,
} from "../../lib/client.ts";

// ------------------------------------------------------------------- transport

test("API_URL is the chat host plus the /v1 version prefix", () => {
  assertEquals(API_URL, "https://chat.googleapis.com/v1");
});

test("client: resolves a relative path against the versioned base", async () => {
  const { ctx, calls } = mockCtx([{ body: { spaces: [] } }]);
  await new GoogleChatClient(ctx).request("/spaces");
  assertEquals(calls[0].url, "https://chat.googleapis.com/v1/spaces");
});

test("client: drops undefined, null and empty-string query values but keeps false and 0", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleChatClient(ctx).request("/x", {
    query: { a: undefined, b: null, c: "", d: false, e: 0, f: "v" },
  });
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.has("a"), false);
  assertEquals(p.has("b"), false);
  assertEquals(p.has("c"), false);
  assertEquals(p.get("d"), "false");
  assertEquals(p.get("e"), "0");
  assertEquals(p.get("f"), "v");
});

test("client: JSON-encodes an object body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleChatClient(ctx).request("/x", { method: "POST", body: { text: "hi" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"text":"hi"}');
});

test("client: sends no body and no content-type when body is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleChatClient(ctx).request("/x", { method: "POST" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
});

test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GoogleChatClient(ctx).request("/x");
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("client: normalises 204 and empty 200 bodies to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200 }]);
  const client = new GoogleChatClient(ctx);
  assertEquals(await client.request("/x"), undefined);
  assertEquals(await client.request("/y"), undefined);
});

test("client: throws with status and upstream detail on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 403, statusText: "Forbidden", body: "insufficient scope" }]);
  const err = await assertRejects(() => new GoogleChatClient(ctx).request("/x"), Error);
  assert(err.message.includes("403"));
  assert(err.message.includes("insufficient scope"));
  assert(err.message.includes("Google Chat"));
});

// -------------------------------------------------------------- spaceName

test("spaceName: prefixes a bare id", () => {
  assertEquals(spaceName("AAAAAAAAAAA"), "spaces/AAAAAAAAAAA");
});

test("spaceName: accepts an already-qualified resource name unchanged", () => {
  assertEquals(spaceName("spaces/AAAAAAAAAAA"), "spaces/AAAAAAAAAAA");
});

test("spaceName: does not double-prefix", () => {
  assertEquals(spaceName(spaceName("A1")), "spaces/A1");
});

test("spaceName: trims surrounding whitespace", () => {
  assertEquals(spaceName("  spaces/A1  "), "spaces/A1");
});

test("spaceName: preserves the `spaces/-` cross-space wildcard", () => {
  assertEquals(spaceName("spaces/-"), "spaces/-");
  assertEquals(spaceName("-"), "spaces/-");
});

test("spaceName: rejects an empty id", () => {
  assertThrows(() => spaceName(""), Error, "space id is required");
  assertThrows(() => spaceName("   "), Error, "space id is required");
});

test("spaceName: rejects an id that would break out of its path segment", () => {
  // `spaces/A/messages/B` is not a space name, so it falls through to the bare-id
  // branch and is refused rather than silently becoming a longer path.
  assertThrows(() => spaceName("spaces/A/messages/B"), Error, "single path segment");
  assertThrows(() => spaceName("A/../../B"), Error, "single path segment");
});

test("spaceName: percent-encodes characters that are not path-safe", () => {
  assertEquals(spaceName("a b"), "spaces/a%20b");
  assertEquals(spaceName("a?b#c"), "spaces/a%3Fb%23c");
});

// -------------------------------------------------------------- messageName

test("messageName: joins a space id and a message id", () => {
  assertEquals(messageName("A1", "B1.B1"), "spaces/A1/messages/B1.B1");
});

test("messageName: accepts qualified space and bare message", () => {
  assertEquals(messageName("spaces/A1", "B1.B1"), "spaces/A1/messages/B1.B1");
});

test("messageName: a full message resource name overrides the space argument", () => {
  assertEquals(
    messageName("spaces/IGNORED", "spaces/A1/messages/B1.B1"),
    "spaces/A1/messages/B1.B1",
  );
  // …and works even when no space was supplied at all.
  assertEquals(messageName("", "spaces/A1/messages/B1.B1"), "spaces/A1/messages/B1.B1");
});

test("messageName: keeps the dot in a system-assigned message id", () => {
  assertEquals(messageName("A1", "BBBB.BBBB"), "spaces/A1/messages/BBBB.BBBB");
});

test("messageName: accepts a client- custom id", () => {
  assertEquals(
    messageName("A1", "client-daily-summary"),
    "spaces/A1/messages/client-daily-summary",
  );
});

test("messageName: rejects an empty message id", () => {
  assertThrows(() => messageName("A1", ""), Error, "message id is required");
});

test("messageName: rejects a partial name that is not a valid message resource name", () => {
  assertThrows(() => messageName("A1", "messages/B1"), Error, "single path segment");
  assertThrows(() => messageName("A1", "spaces/A1/threads/T1"), Error, "single path segment");
});

// -------------------------------------------------------------- membershipName

test("membershipName: joins a space id and a membership id", () => {
  assertEquals(membershipName("A1", "M1"), "spaces/A1/members/M1");
});

test("membershipName: a full membership resource name overrides the space argument", () => {
  assertEquals(membershipName("spaces/IGNORED", "spaces/A1/members/M1"), "spaces/A1/members/M1");
});

test("membershipName: leaves `@` literal so an email alias still routes", () => {
  // Google documents `spaces/{space}/members/{email}` as a valid alias, and `@`
  // is a legal sub-delimiter in a path segment.
  assertEquals(
    membershipName("A1", "person@example.com"),
    "spaces/A1/members/person@example.com",
  );
});

test("membershipName: still encodes genuinely unsafe characters in an alias", () => {
  assertEquals(membershipName("A1", "a b@x.com"), "spaces/A1/members/a%20b@x.com");
});

test("membershipName: rejects an empty member id", () => {
  assertThrows(() => membershipName("A1", ""), Error, "member id is required");
});

// -------------------------------------------------------------- reactionName

test("reactionName: builds the three-level resource name", () => {
  assertEquals(reactionName("A1", "B1.B1", "R1"), "spaces/A1/messages/B1.B1/reactions/R1");
});

test("reactionName: a full reaction resource name overrides both other arguments", () => {
  assertEquals(
    reactionName("spaces/X", "Y", "spaces/A1/messages/B1.B1/reactions/R1"),
    "spaces/A1/messages/B1.B1/reactions/R1",
  );
});

test("reactionName: a full message name in the message argument still works", () => {
  assertEquals(
    reactionName("", "spaces/A1/messages/B1.B1", "R1"),
    "spaces/A1/messages/B1.B1/reactions/R1",
  );
});

test("reactionName: rejects an empty reaction id", () => {
  assertThrows(() => reactionName("A1", "B1", ""), Error, "reaction id is required");
});

// -------------------------------------------------------------- threadName

test("threadName: joins a space id and a thread id", () => {
  assertEquals(threadName("A1", "T1"), "spaces/A1/threads/T1");
  assertEquals(threadName("spaces/A1", "T1"), "spaces/A1/threads/T1");
});

test("threadName: a full thread resource name overrides the space argument", () => {
  assertEquals(threadName("spaces/IGNORED", "spaces/A1/threads/T1"), "spaces/A1/threads/T1");
});

test("threadName: is NOT percent-encoded — it travels in a JSON body, not a path", () => {
  assertEquals(threadName("A1", "T 1"), "spaces/A1/threads/T 1");
});

test("threadName: rejects an empty or multi-segment thread id", () => {
  assertThrows(() => threadName("A1", ""), Error, "thread id is required");
  assertThrows(() => threadName("A1", "a/b"), Error, "single path segment");
});

// -------------------------------------------------------------- userName

test("userName: prefixes a bare user id and accepts a qualified one", () => {
  assertEquals(userName("123456789"), "users/123456789");
  assertEquals(userName("users/123456789"), "users/123456789");
});

test("userName: is NOT percent-encoded — it travels in a query value or JSON body", () => {
  // `URLSearchParams` encodes the query case itself; encoding here would
  // double-encode, and in a JSON body it would corrupt the value outright.
  assertEquals(userName("person@example.com"), "users/person@example.com");
});

test("userName: rejects an empty or multi-segment user id", () => {
  assertThrows(() => userName(""), Error, "user id is required");
  assertThrows(() => userName("a/b"), Error, "single path segment");
});
