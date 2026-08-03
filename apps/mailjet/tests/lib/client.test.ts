import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  API_V3,
  compact,
  formatError,
  MailjetClient,
  pageQuery,
  parseAddress,
  parseAddressList,
  SEND_V31,
} from "../../lib/client.ts";

Deno.test("client: base URLs pin the two live API versions", () => {
  assertEquals(API_HOST, "https://api.mailjet.com");
  assertEquals(API_V3, "https://api.mailjet.com/v3/REST");
  assertEquals(SEND_V31, "https://api.mailjet.com/v3.1/send");
});

Deno.test("client: v3() targets the REST prefix and defaults to GET", async () => {
  const { ctx, calls } = mockCtx([{ body: { Count: 0, Data: [] } }]);
  const client = new MailjetClient(ctx);
  await client.v3("/contact");
  assertEquals(calls[0].url, "https://api.mailjet.com/v3/REST/contact");
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: never sets an Authorization header — sign() owns the credential", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailjetClient(ctx).v3("/contact", { method: "POST", body: { Email: "a@x.com" } });
  const headerNames = Object.keys(calls[0].headers);
  assert(!headerNames.includes("authorization"), `unexpected auth header: ${headerNames}`);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailjetClient(ctx).v3("/contact", { method: "POST", body: { Email: "a@x.com" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ Email: "a@x.com" }));
});

Deno.test("client: query drops undefined, null and empty-string values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MailjetClient(ctx).v3("/contact", {
    query: { Limit: 5, Offset: undefined, Sort: "", Campaign: null, ShowSubject: false },
  });
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("Limit"), "5");
  assert(!params.has("Offset"));
  assert(!params.has("Sort"));
  assert(!params.has("Campaign"));
  // `false` is a meaningful filter value, not an absence — it must survive.
  assertEquals(params.get("ShowSubject"), "false");
});

Deno.test("client: non-2xx throws with the vendor's ErrorMessage", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { ErrorMessage: "Contact already exists" } }]);
  const err = await assertRejects(
    () => new MailjetClient(ctx).v3("/contact", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("Contact already exists"), err.message);
  assert(err.message.includes("400"), err.message);
});

Deno.test("client: non-JSON error body degrades to a bare status, no throw-in-throw", async () => {
  // Mailjet answers a bare 401 with `content-type: text/html` (the Basic challenge).
  const { ctx } = mockCtx([{
    status: 401,
    body: "<html>Unauthorized</html>",
    headers: { "content-type": "text/html" },
  }]);
  const err = await assertRejects(() => new MailjetClient(ctx).v3("/contact"), Error);
  assert(err.message.includes("HTTP 401"), err.message);
});

Deno.test("client: empty response body resolves to undefined rather than a JSON parse error", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new MailjetClient(ctx).v3("/contact"), undefined);
});

Deno.test("formatError: object-valued ErrorMessage (bulk endpoints) is serialized, not '[object Object]'", () => {
  const out = formatError(400, { ErrorMessage: { ContactsLists: [{ Error: "bad list" }] } });
  assert(out.includes("ContactsLists"), out);
  assert(!out.includes("[object Object]"), out);
});

Deno.test("formatError: falls back to the status when the body carries nothing", () => {
  assertEquals(formatError(500, undefined), "HTTP 500");
  assertEquals(formatError(500, {}), "HTTP 500");
});

Deno.test("formatError: joins ErrorMessage with ErrorInfo", () => {
  const out = formatError(400, { ErrorMessage: "boom", ErrorInfo: "field X" });
  assert(out.includes("boom"), out);
  assert(out.includes("field X"), out);
});

Deno.test("pageQuery: maps lowercase input onto Mailjet's capitalised params", () => {
  assertEquals(pageQuery({ limit: 10, offset: 20, sort: "ArrivedAt DESC" }), {
    Limit: 10,
    Offset: 20,
    Sort: "ArrivedAt DESC",
  });
});

Deno.test("parseAddressList: splits a comma-separated string", () => {
  assertEquals(parseAddressList("a@x.com, b@x.com"), [
    { Email: "a@x.com" },
    { Email: "b@x.com" },
  ]);
});

Deno.test("parseAddressList: parses the `Name <addr>` form into Email + Name", () => {
  assertEquals(parseAddressList("Ada Lovelace <ada@x.com>, bo@x.com"), [
    { Email: "ada@x.com", Name: "Ada Lovelace" },
    { Email: "bo@x.com" },
  ]);
});

Deno.test("parseAddressList: strips quotes around a display name", () => {
  assertEquals(parseAddressList('"Lovelace, Ada" <ada@x.com>'), [
    { Email: "ada@x.com", Name: "Lovelace, Ada" },
  ]);
});

Deno.test("parseAddressList: a comma inside a quoted name is not a separator", () => {
  // A naive split would emit a bogus `"Lovelace` recipient alongside the real
  // one — a fictional address Mailjet would accept into the payload.
  assertEquals(parseAddressList('"Lovelace, Ada" <ada@x.com>, bo@x.com'), [
    { Email: "ada@x.com", Name: "Lovelace, Ada" },
    { Email: "bo@x.com" },
  ]);
});

Deno.test("parseAddressList: a comma inside angle brackets is not a separator", () => {
  assertEquals(parseAddressList("Ada <ada@x.com>, Bo <bo@x.com>").length, 2);
});

Deno.test("parseAddressList: accepts an array in either casing and normalises to Mailjet's", () => {
  assertEquals(
    parseAddressList([{ email: "a@x.com", name: "Ada" }, { Email: "b@x.com" }]),
    [{ Email: "a@x.com", Name: "Ada" }, { Email: "b@x.com" }],
  );
});

Deno.test("parseAddressList: drops array entries with no address at all", () => {
  assertEquals(parseAddressList([{ name: "nobody" }, { Email: "b@x.com" }]), [
    { Email: "b@x.com" },
  ]);
});

Deno.test("parseAddressList: empty and undefined input yield an empty array", () => {
  assertEquals(parseAddressList(undefined), []);
  assertEquals(parseAddressList(""), []);
  assertEquals(parseAddressList(" , "), []);
});

Deno.test("parseAddress: takes the first entry only", () => {
  assertEquals(parseAddress("a@x.com, b@x.com"), { Email: "a@x.com" });
  assertEquals(parseAddress(undefined), undefined);
});

Deno.test("compact: drops undefined and empty string, keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: "", d: false, e: 0, f: null }),
    { a: 1, d: false, e: 0, f: null },
  );
});
