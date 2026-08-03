import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  CELLS_HINT,
  compact,
  csv,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  pageQuery,
  SmartsheetClient,
  toCells,
  toId,
} from "../../lib/client.ts";

Deno.test("client: targets the documented 2.0 base URL", () => {
  assertEquals(API_URL, "https://api.smartsheet.com/2.0");
  // The regional hosts exist but are neither called nor allowlisted.
  assert(!API_URL.includes("smartsheet.eu"));
  assert(!API_URL.includes("smartsheet.au"));
});

Deno.test("client: GETs with an accept header and no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new SmartsheetClient(ctx).request("/sheets");
  assertEquals(calls[0].url, "https://api.smartsheet.com/2.0/sheets");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new SmartsheetClient(ctx).request("/sheets", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: serialises a JSON body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { message: "SUCCESS" } }]);
  await new SmartsheetClient(ctx).request("/sheets/1/rows", {
    method: "POST",
    body: [{ toBottom: true }],
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), [{ toBottom: true }]);
});

Deno.test("client: appends query params, skipping undefined, null and empty string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new SmartsheetClient(ctx).request("/sheets", {
    query: { page: 2, pageSize: 0, include: undefined, exclude: null, query: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  // 0 is meaningful and must survive; only undefined/null/"" are dropped.
  assertEquals(url.searchParams.get("pageSize"), "0");
  assertEquals(url.searchParams.has("include"), false);
  assertEquals(url.searchParams.has("exclude"), false);
  assertEquals(url.searchParams.has("query"), false);
});

Deno.test("client: surfaces Smartsheet's errorCode, message and refId on a non-2xx", async () => {
  // The live shape, verified against api.smartsheet.com with a bogus token.
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { errorCode: 1002, message: "Your Access Token is invalid.", refId: "2j1nqp" },
  }]);
  const err = await assertRejects(
    () => new SmartsheetClient(ctx).request("/users/me"),
    Error,
  );
  assert(err.message.includes("Smartsheet 401"));
  assert(err.message.includes("GET"));
  assert(err.message.includes("/2.0/users/me"));
  assert(err.message.includes("Your Access Token is invalid."));
  assert(err.message.includes("errorCode 1002"));
  // refId is what Smartsheet support asks for — it must not be swallowed.
  assert(err.message.includes("refId 2j1nqp"));
});

Deno.test("client: falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const err = await assertRejects(() => new SmartsheetClient(ctx).request("/sheets"), Error);
  assert(err.message.includes("Smartsheet 502"));
});

Deno.test("client: returns undefined for a 204 and for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new SmartsheetClient(ctx);
  assertEquals(await client.request("/sheets/1", { method: "DELETE" }), undefined);
  assertEquals(await client.request("/sheets"), undefined);
});

// --- the cell model ---------------------------------------------------------

Deno.test("toCells: a map is keyed by COLUMN ID, and becomes columnId/value pairs", () => {
  assertEquals(toCells({ "7960873114331012": "In Progress" }), [
    { columnId: 7960873114331012, value: "In Progress" },
  ]);
});

Deno.test("toCells: the map's keys become numeric columnIds, never a title field", () => {
  const cells = toCells({ "4567890123": "x", "1234567890": 42 });
  assertEquals(new Set(cells.map((c) => c.columnId)), new Set([4567890123, 1234567890]));
  for (const c of cells) {
    assertEquals(typeof c.columnId, "number");
    // There is no by-title form on the wire, so nothing may leak one.
    assertEquals("title" in c, false);
    assertEquals("columnTitle" in c, false);
  }
});

Deno.test("toCells: preserves an explicit empty string and null — both CLEAR a cell", () => {
  // Omitting a cell leaves the value alone; sending "" clears it. The two are
  // different instructions and must not be collapsed.
  assertEquals(toCells({ "1": "", "2": null }), [
    { columnId: 1, value: "" },
    { columnId: 2, value: null },
  ]);
});

Deno.test("toCells: preserves false and 0, which are real checkbox and number values", () => {
  assertEquals(toCells({ "1": false, "2": 0 }), [
    { columnId: 1, value: false },
    { columnId: 2, value: 0 },
  ]);
});

Deno.test("toCells: the array form carries formula, objectValue, strict and hyperlink", () => {
  assertEquals(
    toCells([
      { columnId: 1, formula: "=SUM(Cost:Cost)" },
      { columnId: "2", value: "a", strict: false },
      { columnId: 3, objectValue: { objectType: "DATE", value: "2026-08-03" } },
      { columnId: 4, value: "site", hyperlink: { url: "https://example.com" } },
    ]),
    [
      { columnId: 1, formula: "=SUM(Cost:Cost)" },
      { columnId: 2, value: "a", strict: false },
      { columnId: 3, objectValue: { objectType: "DATE", value: "2026-08-03" } },
      { columnId: 4, value: "site", hyperlink: { url: "https://example.com" } },
    ],
  );
});

Deno.test("toCells: a cell without a columnId is refused, and the error names the fix", () => {
  const err = assertThrows(() => toCells([{ value: "x" }]), Error);
  assert(err.message.includes("missing columnId"));
  // The whole point: there is no by-title path, so the error must say where ids
  // come from rather than leaving someone hunting for one.
  assert(/column title/i.test(err.message));
  assert(/List Columns/i.test(err.message));
});

Deno.test("toCells: a title-keyed map is NOT silently accepted", () => {
  // `{"Status": "Done"}` looks plausible and is exactly the mistake this app
  // refuses to paper over — Number("Status") is NaN, so it fails loudly.
  const err = assertThrows(() => toCells({ Status: "Done" }), Error);
  assert(err.message.includes("not an integer id"));
});

Deno.test("toCells: undefined and null yield no cells at all", () => {
  assertEquals(toCells(undefined), []);
  assertEquals(toCells(null), []);
});

Deno.test("toCells: a scalar is refused rather than coerced", () => {
  assertThrows(() => toCells("7960873114331012" as unknown), Error);
});

Deno.test("toId: accepts the 16-digit ids Smartsheet actually issues", () => {
  // Both from Smartsheet's own documentation examples.
  assertEquals(toId("8896508249565060", "rowId"), 8896508249565060);
  assertEquals(toId(7960873114331012, "columnId"), 7960873114331012);
});

Deno.test("toId: refuses an id that would be corrupted by rounding", () => {
  // Number.MAX_SAFE_INTEGER is 9007199254740991. A larger int64 id silently
  // rounds through JSON, which would write to a DIFFERENT column.
  const err = assertThrows(() => toId("90071992547409911", "columnId"), Error);
  assert(err.message.includes("safe integer"));
});

Deno.test("toId: refuses non-integers and non-numbers, naming the field", () => {
  assert(assertThrows(() => toId("abc", "rowId"), Error).message.includes("rowId"));
  assertThrows(() => toId("1.5", "columnId"), Error);
});

Deno.test("toId: refuses the empty string, which Number() would turn into column 0", () => {
  // `Number("")` is 0 — finite, integer, safe — so without an explicit guard a
  // blank param would address column 0 instead of failing.
  assertThrows(() => toId("", "columnId"), Error, "not an integer id");
  assertThrows(() => toId("   ", "columnId"), Error, "not an integer id");
});

Deno.test("toCells: a blank map key is refused rather than becoming column 0", () => {
  assertThrows(() => toCells({ "": "x" }), Error, "not an integer id");
});

Deno.test("toCells: a map's numeric-like keys emit in ascending id order, not source order", () => {
  // ECMAScript orders integer-like own keys numerically. Harmless — Smartsheet's
  // `cells` array carries no positional meaning — but pinned so the behaviour is
  // a documented fact rather than a surprise.
  assertEquals(toCells({ "20": "b", "3": "a" }).map((c) => c.columnId), [3, 20]);
  // The array form preserves author order, for anything that needs it.
  assertEquals(
    toCells([{ columnId: 20, value: "b" }, { columnId: 3, value: "a" }]).map((c) => c.columnId),
    [20, 3],
  );
});

Deno.test("CELLS_HINT: states the columnId rule at the form, not only in the README", () => {
  assert(/COLUMN ID/.test(CELLS_HINT));
  assert(/never by column title/.test(CELLS_HINT));
  assert(/List Columns/.test(CELLS_HINT));
});

// --- query helpers ----------------------------------------------------------

Deno.test("csv: joins a list into the ONE comma-separated param Smartsheet declares", () => {
  // Not `?include=a&include=b` — every include/exclude is a single string param.
  assertEquals(csv(["attachments", "discussions"]), "attachments,discussions");
});

Deno.test("csv: accepts an already-comma-separated string and normalises it", () => {
  assertEquals(csv(" a , b ,, c "), "a,b,c");
});

Deno.test("csv: returns undefined for nothing, so the param is dropped entirely", () => {
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(null), undefined);
  assertEquals(csv([]), undefined);
  assertEquals(csv(""), undefined);
  assertEquals(csv([" ", ""]), undefined);
});

Deno.test("pageQuery: maps page and pageSize through, and only sends includeAll when true", () => {
  assertEquals(pageQuery({ page: 2, pageSize: 50 }), {
    page: 2,
    pageSize: 50,
    includeAll: undefined,
  });
  assertEquals(pageQuery({ includeAll: true }).includeAll, true);
  // includeAll=false is the API default and is mutually exclusive with paging —
  // emitting it would be noise on every request.
  assertEquals(pageQuery({ includeAll: false }).includeAll, undefined);
});

Deno.test("PAGE_PARAMS: exposes page, pageSize and includeAll, and states the exclusivity", () => {
  assertEquals(PAGE_PARAMS.map((p) => p.key), ["page", "pageSize", "includeAll"]);
  const all = PAGE_PARAMS.find((p) => p.key === "includeAll")!;
  assert(/mutually exclusive/i.test(all.hint!));
});

Deno.test("PAGE_OUTPUT: names the IndexResult envelope fields", () => {
  assertEquals(PAGE_OUTPUT.map((o) => o.key), ["data", "totalCount", "pageNumber", "totalPages"]);
});

Deno.test("compact: drops undefined but keeps null, false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: false, d: 0, e: "" }), {
    b: null,
    c: false,
    d: 0,
    e: "",
  });
});
