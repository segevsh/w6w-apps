import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  accountBase,
  accountFromConnection,
  describeError,
  externalIdPath,
  idFromLocation,
  isSuiteTalkUrl,
  NetSuiteClient,
  normaliseAccountId,
  queryString,
  recordId,
  recordPath,
  recordType,
} from "../../lib/client.ts";
import { quoteFilter } from "../../lib/params.ts";
import { BASE, mockCtx, nsError } from "../_helpers.ts";

Deno.test("account id: sandbox ids map to the hostname form, junk is refused", () => {
  assertEquals(normaliseAccountId("1234567_SB1"), "1234567-sb1");
  assertEquals(normaliseAccountId(" TSTDRV123 "), "tstdrv123");
  assertEquals(accountBase("1234567_SB1"), "https://1234567-sb1.suitetalk.api.netsuite.com");
  for (
    const bad of ["", "a.b", "a/b", "evil.com#", "a b", "-x", "x-", "a--b", "1234567@x", "a:443"]
  ) {
    assertThrows(() => normaliseAccountId(bad), Error, "Invalid NetSuite account id");
  }
});

Deno.test("account id: read from the connection's display, refused when absent", () => {
  assertEquals(
    accountFromConnection({ display: { accountId: "1234567_SB1" } } as never),
    "1234567-sb1",
  );
  assertThrows(() => accountFromConnection(undefined), Error, "no account id");
});

Deno.test("isSuiteTalkUrl: only https per-account SuiteTalk hosts qualify", () => {
  assert(isSuiteTalkUrl(`${BASE}/services/rest/record/v1/customer`));
  assert(!isSuiteTalkUrl("https://suitetalk.api.netsuite.com/x"));
  assert(!isSuiteTalkUrl("http://1234567.suitetalk.api.netsuite.com/x"));
  assert(!isSuiteTalkUrl("https://1234567.suitetalk.api.netsuite.com.evil.com/x"));
  assert(!isSuiteTalkUrl("https://evil.com/1234567.suitetalk.api.netsuite.com"));
  assert(!isSuiteTalkUrl("not a url"));
});

Deno.test("record type and id are validated and encoded into the path", () => {
  assertEquals(recordPath("salesOrder", recordId("42")), "/services/rest/record/v1/salesOrder/42");
  assertEquals(recordId("eid:CID 001"), "eid:CID%20001");
  assertEquals(externalIdPath("A/B"), "eid:A%2FB");
  assertEquals(recordType("customrecord_x1"), "customrecord_x1");
  assertThrows(() => recordType("customer/../x"), Error, "Invalid record type");
  assertThrows(() => recordType(""), Error);
  assertThrows(() => recordId(""), Error, "required");
  assertThrows(() => recordId("eid:"), Error, "external id");
  assertEquals(recordId("../x"), "..%2Fx");
});

Deno.test("queryString: drops blanks, keeps 0/false, encodes spaces as %20", () => {
  assertEquals(
    queryString({ q: 'email IS "a"', limit: 0, offset: undefined, x: "", f: false }),
    "?q=email%20IS%20%22a%22&limit=0&f=false",
  );
  assertEquals(queryString({}), "");
});

Deno.test("idFromLocation: the trailing segment, or null", () => {
  assertEquals(idFromLocation(`${BASE}/services/rest/record/v1/customer/647`), "647");
  assertEquals(idFromLocation(`${BASE}/services/rest/record/v1/customer/eid:A%201`), "eid:A 1");
  assertEquals(idFromLocation(null), null);
});

Deno.test("describeError: reads NetSuite's o:errorDetails envelope", () => {
  assertEquals(
    describeError({
      title: "Bad Request",
      "o:errorDetails": [{
        detail: "bad item",
        "o:errorCode": "INVALID_CONTENT",
        "o:errorPath": "item.items[0].item",
      }],
    }),
    { message: "bad item", code: "INVALID_CONTENT", path: "item.items[0].item" },
  );
  assertEquals(describeError({ title: "Unauthorized" }), { message: "Unauthorized" });
  assertEquals(describeError(null), {});
});

Deno.test("quoteFilter: wraps in quotes and refuses an embedded quote", () => {
  assertEquals(quoteFilter("Barbara Allen"), '"Barbara Allen"');
  assertThrows(() => quoteFilter('a"b'), Error, "double quote");
});

Deno.test("client: base host comes from the connection, never an action param", () => {
  const { ctx } = mockCtx([], "1234567_SB1");
  assertEquals(new NetSuiteClient(ctx).base, "https://1234567-sb1.suitetalk.api.netsuite.com");
  assertThrows(() => new NetSuiteClient(mockCtx([], null).ctx), Error, "no account id");
});

Deno.test("client: never sets Authorization, sends JSON accept + content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new NetSuiteClient(ctx).request("/services/rest/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].url, `${BASE}/services/rest/x`);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: an error is classified from the body's errorCode, not the status", async () => {
  const { ctx } = mockCtx([nsError(400, "INVALID_CONTENT", "bad field")]);
  const err = await assertRejects(
    () => new NetSuiteClient(ctx).request("/x"),
    Error,
    "bad field",
  );
  assertEquals((err as { code?: string }).code, "INVALID_CONTENT");
  assertEquals((err as { status?: number }).status, 400);
});

Deno.test("client: a non-JSON error and a non-JSON success are both refused", async () => {
  const html = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  await assertRejects(() => new NetSuiteClient(html.ctx).request("/x"), Error, "HTTP 502");
  const odd = mockCtx([{ status: 200, body: "OK" }]);
  await assertRejects(() => new NetSuiteClient(odd.ctx).request("/x"), Error, "non-JSON");
});
