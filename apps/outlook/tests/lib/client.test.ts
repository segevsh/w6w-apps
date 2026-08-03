import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  compact,
  dateTimeTimeZone,
  GraphClient,
  itemBody,
  odataList,
  preferHeaders,
  searchTerm,
  toRecipients,
} from "../../lib/client.ts";

Deno.test("client: targets the Graph v1.0 endpoint", () => {
  assertEquals(API_URL, "https://graph.microsoft.com/v1.0");
});

Deno.test("client: builds an absolute URL and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await new GraphClient(ctx).request("/me/messages", {
    query: { $top: 10, $filter: undefined, $select: "", $search: '"x"' },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://graph.microsoft.com/v1.0/me/messages");
  assertEquals(url.searchParams.get("$top"), "10");
  assertEquals(url.searchParams.get("$select"), null);
  assertEquals(url.searchParams.get("$filter"), null);
  assertEquals(url.searchParams.get("$search"), '"x"');
});

Deno.test("client: a path that is already a URL is used verbatim (nextLink replay)", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  const link = "https://graph.microsoft.com/v1.0/me/messages?$skip=10&$top=10";
  await new GraphClient(ctx).request(link);
  assertEquals(calls[0].url, link);
});

Deno.test("client: JSON bodies set content-type and never an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await new GraphClient(ctx).request("/me/messages", {
    method: "POST",
    body: { subject: "hi" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(JSON.parse(calls[0].body!).subject, "hi");
});

Deno.test("client: 202 and 204 resolve without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 202, body: undefined }, { status: 204, body: undefined }]);
  const client = new GraphClient(ctx);
  assertEquals(await client.request("/me/sendMail", { method: "POST", body: {} }), undefined);
  assertEquals(await client.request("/me/messages/1", { method: "DELETE" }), undefined);
});

Deno.test("client: status() reports the accepted HTTP code", async () => {
  const { ctx } = mockCtx([{ status: 202, body: undefined }]);
  const out = await new GraphClient(ctx).status("/me/sendMail", { method: "POST", body: {} });
  assertEquals(out, { status: 202 });
});

Deno.test("client: surfaces Graph's error code and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { error: { code: "ErrorItemNotFound", message: "The specified object was not found." } },
  }]);
  const err = await assertRejects(
    () => new GraphClient(ctx).request("/me/messages/nope"),
    Error,
  );
  assert(err.message.includes("404"));
  assert(err.message.includes("ErrorItemNotFound"));
  assert(err.message.includes("The specified object was not found."));
});

Deno.test("client: falls back to raw text when the error is not Graph's envelope", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "upstream exploded" }]);
  const err = await assertRejects(() => new GraphClient(ctx).request("/me"), Error);
  assert(err.message.includes("upstream exploded"));
});

Deno.test("client: page() unwraps `value` and hands back the nextLink", async () => {
  const { ctx } = mockCtx([{
    body: {
      value: [{ id: "a" }, { id: "b" }],
      "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/messages?$skip=2",
    },
  }]);
  const out = await new GraphClient(ctx).page("/me/messages");
  assertEquals(out.value.length, 2);
  assertEquals(out.nextLink, "https://graph.microsoft.com/v1.0/me/messages?$skip=2");
  assertEquals(out.pages, 1);
});

Deno.test("client: collect() follows @odata.nextLink to exhaustion", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/messages?$skip=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await new GraphClient(ctx).collect("/me/messages", { query: { $top: 1 } });
  assertEquals(out.value.map((v) => (v as { id: string }).id), ["a", "b"]);
  assertEquals(out.pages, 2);
  assertEquals(out.nextLink, undefined);
  // The second call replays the link verbatim rather than re-appending $top.
  assertEquals(calls[1].url, next);
});

Deno.test("client: collect() stops at maxPages and returns the surviving cursor", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/messages?$skip=1";
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "a" }], "@odata.nextLink": next } }]);
  const out = await new GraphClient(ctx).collect("/me/messages", {}, 1);
  assertEquals(calls.length, 1);
  assertEquals(out.pages, 1);
  assertEquals(out.nextLink, next);
});

Deno.test("toRecipients: wraps addresses and parses the `Name <addr>` form", () => {
  assertEquals(toRecipients(["a@b.com"]), [{ emailAddress: { address: "a@b.com" } }]);
  assertEquals(toRecipients(["Alice <alice@example.com>"]), [
    { emailAddress: { address: "alice@example.com", name: "Alice" } },
  ]);
  // Empty stays undefined so a PATCH does not read as "clear the recipients".
  assertEquals(toRecipients([]), undefined);
  assertEquals(toRecipients(["  "]), undefined);
  assertEquals(toRecipients(undefined), undefined);
});

Deno.test("itemBody: maps the format selector onto Graph's contentType", () => {
  assertEquals(itemBody("hi", "Text"), { contentType: "Text", content: "hi" });
  assertEquals(itemBody("<b>hi</b>", "HTML"), { contentType: "HTML", content: "<b>hi</b>" });
  // Graph's own default is HTML.
  assertEquals(itemBody("hi"), { contentType: "HTML", content: "hi" });
  assertEquals(itemBody(undefined), undefined);
});

Deno.test("dateTimeTimeZone: strips the offset Graph cannot accept", () => {
  assertEquals(dateTimeTimeZone("2026-08-15T12:00:00Z"), {
    dateTime: "2026-08-15T12:00:00",
    timeZone: "UTC",
  });
  assertEquals(dateTimeTimeZone("2026-08-15T12:00:00-07:00", "Pacific Standard Time"), {
    dateTime: "2026-08-15T12:00:00",
    timeZone: "Pacific Standard Time",
  });
  assertEquals(dateTimeTimeZone("2026-08-15T12:00:00", "UTC"), {
    dateTime: "2026-08-15T12:00:00",
    timeZone: "UTC",
  });
});

Deno.test("searchTerm: quotes for KQL without double-quoting", () => {
  assertEquals(searchTerm("pizza"), '"pizza"');
  assertEquals(searchTerm('"subject:report"'), '"subject:report"');
  assertEquals(searchTerm("  "), undefined);
  assertEquals(searchTerm(undefined), undefined);
});

Deno.test("odataList: joins repeats and drops blanks", () => {
  assertEquals(odataList(["id", " subject ", ""]), "id,subject");
  assertEquals(odataList([]), undefined);
  assertEquals(odataList(undefined), undefined);
});

Deno.test("preferHeaders: emits quoted Prefer values, or nothing", () => {
  assertEquals(preferHeaders({ bodyContentType: "text" }), {
    prefer: 'outlook.body-content-type="text"',
  });
  assertEquals(preferHeaders({ timeZone: "Pacific Standard Time" }), {
    prefer: 'outlook.timezone="Pacific Standard Time"',
  });
  assertEquals(preferHeaders({ bodyContentType: "text", timeZone: "UTC" }), {
    prefer: 'outlook.body-content-type="text", outlook.timezone="UTC"',
  });
  assertEquals(preferHeaders({}), undefined);
});

Deno.test("compact: keeps false and 0 but drops undefined", () => {
  assertEquals(compact({ a: 1, b: undefined, c: false, d: 0, e: null }), {
    a: 1,
    c: false,
    d: 0,
    e: null,
  });
});
