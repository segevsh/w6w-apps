import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { compact, errorCode, errorText, FareHarborClient, queryString } from "../../lib/client.ts";
import { checkinStatus, parseJson, pk, seg, ymd } from "../../lib/params.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("queryString: booleans are yes/no, unset values are dropped, false is kept", () => {
  assertEquals(
    queryString({ a: true, b: false, c: undefined, d: null, e: "", f: 0, g: "x y" }),
    "?a=yes&b=no&f=0&g=x+y",
  );
  assertEquals(queryString({}), "");
  assertEquals(compact({ a: 1, b: undefined }), { a: 1 });
});

Deno.test("errorCode/errorText: read the vendor envelope, tolerate anything else", () => {
  const b = errorBody(403, "app-key-invalid", "API app key is invalid");
  assertEquals(errorCode(b), "app-key-invalid");
  assertEquals(errorText(b), "API app key is invalid");
  assertEquals(errorCode(null), undefined);
  assertEquals(errorText("x"), undefined);
  assertEquals(errorCode({ code: 5 }), undefined);
});

Deno.test("client: sends accept, never an auth header, and JSON-encodes bodies", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new FareHarborClient(ctx).request("/x/", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: a 200 with a non-JSON body is an error, an empty 2xx is null", async () => {
  const bad = mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await new FareHarborClient(bad.ctx).get("/x/"),
    Error,
    "not JSON",
  );
  const empty = mockCtx([{ status: 200 }]);
  assertEquals(await new FareHarborClient(empty.ctx).get("/x/"), null);
});

Deno.test("client: an error carries status, code and sentence; a non-JSON error carries the text", async () => {
  const a = mockCtx([{
    status: 403,
    body: errorBody(403, "user-key-invalid", "API user key is invalid"),
  }]);
  await assertRejects(
    async () => await new FareHarborClient(a.ctx).get("/x/"),
    Error,
    "FareHarbor 403 user-key-invalid: API user key is invalid",
  );
  const b = mockCtx([{ status: 504, body: "timeout", headers: {} }]);
  await assertRejects(
    async () => await new FareHarborClient(b.ctx).get("/x/"),
    Error,
    "FareHarbor 504: timeout",
  );
});

Deno.test("params: seg/pk/ymd guard path segments", () => {
  assertEquals(seg(" a/b ", "x"), "a%2Fb");
  assertThrows(() => seg("", "shortname"), Error, "shortname is required");
  assertEquals(pk(7, "p"), "7");
  assertThrows(() => pk("7/../8", "itemPk"), Error, "numeric");
  assertEquals(ymd("2026-11-02T10:00:00Z", "d"), "2026-11-02");
  assertThrows(() => ymd("11/02/2026", "date"), Error, "YYYY-MM-DD");
  assertThrows(() => ymd("2026-11-02x", "date"), Error, "YYYY-MM-DD");
});

Deno.test("params: parseJson accepts values and strings; checkinStatus maps numerics", () => {
  assertEquals(parseJson<number[]>("[1]", "x"), [1]);
  assertEquals(parseJson<number[]>([2], "x"), [2]);
  assertThrows(() => parseJson("{", "contact"), Error, "contact is not valid JSON");
  assertEquals(checkinStatus(""), undefined);
  assertEquals(checkinStatus("auto"), "auto");
  assertEquals(checkinStatus(" 31 "), 31);
  assertEquals(checkinStatus(4), 4);
});
