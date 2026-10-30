import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import {
  API_URL,
  compact,
  encodeItemPath,
  GraphClient,
  odataList,
  odataString,
  rangeSegment,
  segment,
  SESSION_HEADER,
  sessionHeaders,
  workbookPath,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

// ------------------------------------------------------- workbook addressing --

test("workbookPath: item-id form", () => {
  assertEquals(
    workbookPath({ itemId: "01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN" }),
    "/me/drive/items/01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN/workbook",
  );
});

test("workbookPath: path form uses the `root:/…:/` delimiters", () => {
  assertEquals(
    workbookPath({ itemPath: "Reports/Q3.xlsx" }),
    "/me/drive/root:/Reports/Q3.xlsx:/workbook",
  );
});

test("workbookPath: path form encodes each segment but keeps the separators", () => {
  assertEquals(
    workbookPath({ itemPath: "Q3 Reports/Final & Signed.xlsx" }),
    "/me/drive/root:/Q3%20Reports/Final%20%26%20Signed.xlsx:/workbook",
  );
});

test("workbookPath: tolerates leading, trailing and doubled separators", () => {
  assertEquals(
    workbookPath({ itemPath: "/Reports//Q3.xlsx/" }),
    "/me/drive/root:/Reports/Q3.xlsx:/workbook",
  );
});

test("workbookPath: encodes an item id rather than trusting it", () => {
  assertEquals(
    workbookPath({ itemId: "a b/c" }),
    "/me/drive/items/a%20b%2Fc/workbook",
  );
});

test("workbookPath: refuses both forms at once", () => {
  assertThrows(
    () => workbookPath({ itemId: "abc", itemPath: "Q3.xlsx" }),
    Error,
    "not both",
  );
});

test("workbookPath: refuses neither form", () => {
  assertThrows(() => workbookPath({}), Error, "must be addressed");
});

test("workbookPath: whitespace-only input counts as absent", () => {
  assertThrows(() => workbookPath({ itemId: "   ", itemPath: "  " }), Error, "must be addressed");
});

test("workbookPath: a path of only separators is an error, not an empty path", () => {
  // Distinct from "you gave me nothing": the caller did address a workbook, the
  // address just collapsed to nothing once the separators were stripped.
  assertThrows(() => workbookPath({ itemPath: "///" }), Error, "empty after trimming");
});

test("encodeItemPath: drops empty segments and encodes the rest", () => {
  assertEquals(encodeItemPath("a//b c/d"), "a/b%20c/d");
});

// ------------------------------------------------------------------ segments --

test("segment: URL-encodes the braces Excel wraps worksheet ids in", () => {
  assertEquals(
    segment("{75A18F35-34AA-4F44-97CC-FDC3C05D9F40}"),
    "%7B75A18F35-34AA-4F44-97CC-FDC3C05D9F40%7D",
  );
});

test("segment: encodes a name with a space or a slash", () => {
  assertEquals(segment("Q3 Summary"), "Q3%20Summary");
  assertEquals(segment("a/b"), "a%2Fb");
});

test("segment: rejects an empty identifier", () => {
  assertThrows(() => segment("  "), Error, "empty");
});

// -------------------------------------------------------------------- ranges --

test("rangeSegment: builds the OData function form", () => {
  assertEquals(rangeSegment("A1:D5"), "/range(address='A1:D5')");
});

test("rangeSegment: keeps a sheet-qualified address intact", () => {
  assertEquals(rangeSegment("Sheet1!A1:B2"), "/range(address='Sheet1!A1:B2')");
});

test("rangeSegment: doubles an apostrophe, per OData string escaping", () => {
  assertEquals(rangeSegment("'Bob''s Sheet'!A1"), "/range(address='''Bob''''s Sheet''!A1')");
});

test("rangeSegment: falls back to the bare /range when no address is given", () => {
  assertEquals(rangeSegment(), "/range");
  assertEquals(rangeSegment("   "), "/range");
});

test("odataString: doubles apostrophes and leaves everything else alone", () => {
  assertEquals(odataString("O'Brien"), "O''Brien");
  assertEquals(odataString("plain"), "plain");
});

// ------------------------------------------------------------------ sessions --

test("sessionHeaders: emits the documented header name", () => {
  assertEquals(SESSION_HEADER, "workbook-session-id");
  assertEquals(sessionHeaders("abc123"), { "workbook-session-id": "abc123" });
});

test("sessionHeaders: absent or blank id means sessionless — no header at all", () => {
  assertEquals(sessionHeaders(), undefined);
  assertEquals(sessionHeaders(""), undefined);
  assertEquals(sessionHeaders("   "), undefined);
});

test("sessionHeaders: trims, so a pasted id with whitespace still works", () => {
  assertEquals(sessionHeaders("  abc  "), { "workbook-session-id": "abc" });
});

// -------------------------------------------------------------------- client --

test("GraphClient: prefixes relative paths with the v1.0 base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new GraphClient(ctx).request("/me/drive");
  assertEquals(calls[0].url, `${API_URL}/me/drive`);
  assertEquals(calls[0].method, "GET");
});

test("GraphClient: replays an absolute URL verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='x')?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await new GraphClient(ctx).request(link);
  assertEquals(calls[0].url, link);
});

test("GraphClient: drops empty query values instead of sending blanks", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GraphClient(ctx).request("/x", {
    query: { $top: 5, $skip: undefined, $select: "", $filter: null },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$top"), "5");
  assertEquals(url.searchParams.has("$skip"), false);
  assertEquals(url.searchParams.has("$select"), false);
  assertEquals(url.searchParams.has("$filter"), false);
});

test("GraphClient: a JSON body sets content-type and passes headers through", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1" } }]);
  await new GraphClient(ctx).request("/x", {
    method: "POST",
    body: { persistChanges: true },
    headers: sessionHeaders("s1"),
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
  assertEquals(JSON.parse(calls[0].body!), { persistChanges: true });
});

test("GraphClient: 204 returns undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GraphClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

test("GraphClient: status() reports the code for the no-content endpoints", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GraphClient(ctx).status("/x", { method: "POST" }), { status: 204 });
});

test("GraphClient: surfaces Graph's error code and message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: {
      error: { code: "ItemAlreadyExists", message: "A resource with the same name exists." },
    },
  }]);
  try {
    await new GraphClient(ctx).request("/me/drive/items/x/workbook/worksheets/add");
    throw new Error("expected a rejection");
  } catch (e) {
    const msg = (e as Error).message;
    assert(msg.includes("400"), msg);
    assert(msg.includes("ItemAlreadyExists"), msg);
    assert(msg.includes("A resource with the same name exists."), msg);
  }
});

test("GraphClient: page() unwraps the OData envelope", async () => {
  const { ctx } = mockCtx([{ body: { value: [{ id: "1" }, { id: "2" }] } }]);
  const out = await new GraphClient(ctx).page("/x");
  assertEquals(out.value.length, 2);
  assertEquals(out.pages, 1);
  assertEquals(out.nextLink, undefined);
});

test("GraphClient: collect() walks nextLink and stops at maxPages", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='x')?$skiptoken=1";
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "a" }], "@odata.nextLink": next } }]);
  const out = await new GraphClient(ctx).collect("/x", {}, 1);
  assertEquals(calls.length, 1);
  assertEquals(out.nextLink, next);
  assertEquals(out.pages, 1);
});

// ------------------------------------------------------------------ helpers --

test("odataList: joins, trims and drops blanks", () => {
  assertEquals(odataList([" id ", "", "name"]), "id,name");
  assertEquals(odataList([]), undefined);
  assertEquals(odataList(), undefined);
});

test("compact: drops undefined but keeps null and false", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: false }), { a: 1, c: null, d: false });
});
