import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  compact,
  dateTimeTimeZone,
  encodeId,
  GraphClient,
  itemBody,
  odataList,
  taskPath,
  taskPayload,
  tasksPath,
} from "../../lib/client.ts";

Deno.test("client: pins the v1.0 base — never beta", () => {
  assertEquals(API_URL, "https://graph.microsoft.com/v1.0");
});

Deno.test("client: builds absolute URLs and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await new GraphClient(ctx).request("/me/todo/lists", {
    query: { $top: 5, $select: undefined, $filter: "", $orderby: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API_URL}/me/todo/lists`);
  assertEquals([...url.searchParams.keys()], ["$top"]);
  assertEquals(url.searchParams.get("$top"), "5");
});

Deno.test("client: a path starting with http is replayed verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/todo/lists?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await new GraphClient(ctx).page(link);
  assertEquals(calls[0].url, link);
});

Deno.test("client: never sets an Authorization header — sign owns the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await new GraphClient(ctx).request("/me/todo/lists");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: JSON bodies set content-type; a GET sends none", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: { value: [] } }]);
  const client = new GraphClient(ctx);
  await client.request("/me/todo/lists", { method: "POST", body: { displayName: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"displayName":"x"}');
  await client.request("/me/todo/lists");
  assertEquals(calls[1].headers["content-type"], undefined);
  assertEquals(calls[1].body, null);
});

Deno.test("client: status() handles the 204 that every To Do DELETE returns", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GraphClient(ctx).status("/me/todo/lists/A", { method: "DELETE" }), {
    status: 204,
  });
});

Deno.test("client: request() on a 204 resolves undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GraphClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

Deno.test("client: surfaces Graph's error.code and error.message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { error: { code: "ErrorItemNotFound", message: "The specified object was not found." } },
  }]);
  const err = await assertRejects(() => new GraphClient(ctx).request("/me/todo/lists/nope"));
  assert(err instanceof Error);
  assert(err.message.includes("404"));
  assert(err.message.includes("ErrorItemNotFound"));
  assert(err.message.includes("The specified object was not found."));
});

Deno.test("client: a non-JSON error body is surfaced verbatim", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "upstream exploded" }]);
  const err = await assertRejects(() => new GraphClient(ctx).request("/x"));
  assert((err as Error).message.includes("upstream exploded"));
});

Deno.test("client: page() reads one page and returns the nextLink", async () => {
  const { ctx, calls } = mockCtx([{
    body: { value: [{ id: "1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/next" },
  }]);
  const out = await new GraphClient(ctx).page("/me/todo/lists");
  assertEquals(calls.length, 1);
  assertEquals(out.pages, 1);
  assertEquals(out.nextLink, "https://graph.microsoft.com/v1.0/next");
});

Deno.test("client: collect() walks nextLink and carries the closing deltaLink", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/p2" } },
    { body: { value: [{ id: "2" }], "@odata.deltaLink": "https://graph.microsoft.com/v1.0/d" } },
  ]);
  const out = await new GraphClient(ctx).collect("/me/todo/lists/delta");
  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, "https://graph.microsoft.com/v1.0/p2");
  assertEquals(out.value.map((v) => (v as { id: string }).id), ["1", "2"]);
  assertEquals(out.pages, 2);
  assertEquals(out.nextLink, undefined);
  assertEquals(out.deltaLink, "https://graph.microsoft.com/v1.0/d");
});

Deno.test("client: collect() stops at maxPages and hands back the surviving cursor", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/p2" } },
    { body: { value: [{ id: "2" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/p3" } },
  ]);
  const out = await new GraphClient(ctx).collect("/x", {}, 2);
  assertEquals(calls.length, 2);
  assertEquals(out.nextLink, "https://graph.microsoft.com/v1.0/p3");
});

Deno.test("client: collect() does not re-send query params on a continuation", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [], "@odata.nextLink": "https://graph.microsoft.com/v1.0/p2" } },
    { body: { value: [] } },
  ]);
  await new GraphClient(ctx).collect("/x", { query: { $top: 3 } });
  assert(calls[0].url.includes("%24top=3") || calls[0].url.includes("$top=3"));
  assertEquals(calls[1].url, "https://graph.microsoft.com/v1.0/p2");
});

Deno.test("encodeId: percent-encodes the base64 characters To Do ids contain", () => {
  assertEquals(encodeId("AAMkADIyAAAAABrJAAA="), "AAMkADIyAAAAABrJAAA%3D");
  assertEquals(encodeId("a+b/c=="), "a%2Bb%2Fc%3D%3D");
  // A traversal attempt cannot escape its segment.
  assertEquals(encodeId("../../me"), "..%2F..%2Fme");
});

Deno.test("tasksPath / taskPath: encode every id they interpolate", () => {
  assertEquals(tasksPath("A=B"), "/me/todo/lists/A%3DB/tasks");
  assertEquals(taskPath("A=B", "C/D"), "/me/todo/lists/A%3DB/tasks/C%2FD");
});

Deno.test("itemBody: defaults to text and only html opts out", () => {
  assertEquals(itemBody("hi"), { contentType: "text", content: "hi" });
  assertEquals(itemBody("hi", "HTML"), { contentType: "html", content: "hi" });
  assertEquals(itemBody("hi", "text"), { contentType: "text", content: "hi" });
  assertEquals(itemBody(undefined), undefined);
  // An empty string is a real value — "clear the notes" — not an absence.
  assertEquals(itemBody(""), { contentType: "text", content: "" });
});

Deno.test("dateTimeTimeZone: strips the offset Graph rejects and defaults to UTC", () => {
  assertEquals(dateTimeTimeZone("2026-08-03T09:00:00Z"), {
    dateTime: "2026-08-03T09:00:00",
    timeZone: "UTC",
  });
  assertEquals(dateTimeTimeZone("2026-08-03T09:00:00+02:00", "Eastern Standard Time"), {
    dateTime: "2026-08-03T09:00:00",
    timeZone: "Eastern Standard Time",
  });
  assertEquals(dateTimeTimeZone(" 2026-08-03T09:00:00-0500 "), {
    dateTime: "2026-08-03T09:00:00",
    timeZone: "UTC",
  });
});

Deno.test("odataList: joins with commas and collapses empties away", () => {
  assertEquals(odataList(["id", " title ", ""]), "id,title");
  assertEquals(odataList([]), undefined);
  assertEquals(odataList(undefined), undefined);
});

Deno.test("compact: drops undefined but keeps null, false and empty arrays", () => {
  assertEquals(compact({ a: undefined, b: null, c: false, d: [], e: 0 }), {
    b: null,
    c: false,
    d: [],
    e: 0,
  });
});

Deno.test("taskPayload: nests the date fields and shares one time zone", () => {
  const body = taskPayload({
    title: "Ship it",
    dueDateTime: "2026-08-10T17:00:00Z",
    reminderDateTime: "2026-08-10T09:00:00Z",
    timeZone: "Eastern Standard Time",
  });
  assertEquals(body.title, "Ship it");
  assertEquals(body.dueDateTime, {
    dateTime: "2026-08-10T17:00:00",
    timeZone: "Eastern Standard Time",
  });
  assertEquals(body.reminderDateTime, {
    dateTime: "2026-08-10T09:00:00",
    timeZone: "Eastern Standard Time",
  });
  // Nothing else was set, so nothing else is sent — that is what makes PATCH partial.
  assertEquals(Object.keys(body).sort(), ["dueDateTime", "reminderDateTime", "title"]);
});

Deno.test("taskPayload: an unset field is never sent, but false and [] are", () => {
  assertEquals(taskPayload({}), {});
  assertEquals(taskPayload({ isReminderOn: false }), { isReminderOn: false });
  assertEquals(taskPayload({ categories: [] }), { categories: [] });
});
