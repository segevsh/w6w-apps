import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  bool,
  compact,
  encodeId,
  formatSendfoxError,
  parseAccountRestricted,
  SendfoxClient,
  toIdList,
  truncate,
} from "../../lib/client.ts";
import {
  accountRestrictedBody,
  errorBody,
  mockCtx,
  page,
  pathOf,
  queryAllOf,
  queryOf,
} from "../_helpers.ts";

Deno.test("client: the base is SendFox's one declared server, with no version prefix", () => {
  assertEquals(API_BASE, "https://api.sendfox.com");
});

Deno.test("client: json() parses the bare entity a single-resource read answers", async () => {
  const { ctx } = mockCtx([{ body: { id: 1, email: "a@b.c" } }]);
  assertEquals(await new SendfoxClient(ctx).json("/me"), { id: 1, email: "a@b.c" });
});

Deno.test("client: json() returns the paginated envelope untouched", async () => {
  const { ctx } = mockCtx([{ body: page([{ id: 1 }], { total: 5 }) }]);
  const out = await new SendfoxClient(ctx).json<{ data: unknown[]; total: number }>("/contacts");
  assertEquals(out.total, 5);
  assertEquals(out.data, [{ id: 1 }]);
});

Deno.test("client: a 204 or an empty body yields undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }, { body: "" }]);
  assertEquals(await new SendfoxClient(ctx).json("/x"), undefined);
  assertEquals(await new SendfoxClient(ctx).json("/y"), undefined);
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SendfoxClient(ctx).json("/contacts", {
    query: { a: "x", b: undefined, c: null, d: "", e: 0, f: false },
  });
  assertEquals(queryOf(calls[0].url), { a: "x", e: "0", f: "false" });
});

/**
 * SendFox documents its id filters as OpenAPI arrays in the default
 * `style: form, explode: true` form, so an array is a REPEATED key — never a
 * comma-joined value, which Laravel would read as one bad id.
 */
Deno.test("client: array query values are repeated keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SendfoxClient(ctx).json("/contacts", {
    query: { "filter[in_list_ids]": [1, 2, 3] },
  });

  assertEquals(queryAllOf(calls[0].url, "filter[in_list_ids]"), ["1", "2", "3"]);
  assert(!calls[0].url.includes("%2C"), calls[0].url);
});

Deno.test("client: a JSON body sets the content type the vendor requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await new SendfoxClient(ctx).json("/contacts", { method: "POST", body: { email: "a@b.c" } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"email":"a@b.c"}');
});

Deno.test("client: a request with no body sends none", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SendfoxClient(ctx).json("/campaigns/1/send", { method: "POST" });

  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
});

Deno.test("client: the path is built under the base", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new SendfoxClient(ctx).json("/contact-tags");
  assertEquals(calls[0].url, "https://api.sendfox.com/contact-tags");
  assertEquals(pathOf(calls[0].url), "/contact-tags");
});

Deno.test("client: request() hands back the raw response, headers included", async () => {
  const { ctx } = mockCtx([{ body: {}, headers: { "x-ratelimit-limit": "60" } }]);
  const res = await new SendfoxClient(ctx).request("/me");
  assertEquals(res.headers.get("x-ratelimit-limit"), "60");
});

Deno.test("client: a non-2xx response throws with the vendor's message", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: errorBody("Contact not found") },
  ]);
  const err = await assertRejects(() => new SendfoxClient(ctx).json("/contacts/9"), Error);

  assert(err.message.includes("404"), err.message);
  assert(err.message.includes("/contacts/9"), err.message);
  assert(err.message.includes("Contact not found"), err.message);
});

// --- error formatting -------------------------------------------------------

Deno.test("formatSendfoxError: keeps the Laravel message", () => {
  assertEquals(
    formatSendfoxError(404, "GET", "/contacts/9", JSON.stringify(errorBody("Contact not found"))),
    "SendFox 404 for GET /contacts/9: Contact not found",
  );
});

Deno.test("formatSendfoxError: a 422 appends the field-level errors", () => {
  const msg = formatSendfoxError(
    422,
    "POST",
    "/contacts",
    JSON.stringify(
      errorBody("The given data was invalid.", {
        email: ["The email has already been taken."],
      }),
    ),
  );
  assert(msg.includes("The given data was invalid."), msg);
  assert(msg.includes("validation: email: The email has already been taken."), msg);
});

Deno.test("formatSendfoxError: an account_restricted 403 keeps its status URL", () => {
  const msg = formatSendfoxError(403, "GET", "/me", JSON.stringify(accountRestrictedBody()));
  assert(msg.includes("account_restricted"), msg);
  assert(msg.includes("https://sendfox.com/account/status"), msg);
});

Deno.test("formatSendfoxError: a 429 carries the backoff advice the vendor documents", () => {
  const msg = formatSendfoxError(
    429,
    "GET",
    "/contacts",
    JSON.stringify(errorBody("Too Many Attempts.")),
  );
  assert(/60 requests\/minute/.test(msg), msg);
});

Deno.test("formatSendfoxError: a non-JSON body falls back to the raw text", () => {
  const msg = formatSendfoxError(502, "GET", "/contacts", "<html>bad gateway</html>");
  assert(msg.includes("<html>bad gateway</html>"), msg);
});

Deno.test("parseAccountRestricted: only the structured body qualifies", () => {
  assertEquals(
    parseAccountRestricted(JSON.stringify(accountRestrictedBody()))?.code,
    "account_restricted",
  );
  assertEquals(parseAccountRestricted(JSON.stringify(errorBody("Forbidden"))), undefined);
  assertEquals(parseAccountRestricted("<html>"), undefined);
});

// --- small helpers ----------------------------------------------------------

Deno.test("bool: true/false are both sent, unset is absent", () => {
  assertEquals(bool(true), "true");
  assertEquals(bool(false), "false");
  assertEquals(bool(undefined), undefined);
});

Deno.test("compact: drops undefined, null and empty string but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: [] }), {
    a: 1,
    e: false,
    f: 0,
    g: [],
  });
});

Deno.test("toIdList: normalises an array, a comma string and junk", () => {
  assertEquals(toIdList([1, 2]), [1, 2]);
  assertEquals(toIdList("1, 2 ,3"), [1, 2, 3]);
  assertEquals(toIdList([1, 0, -2]), [1]);
  assertEquals(toIdList([]), undefined);
  assertEquals(toIdList(""), undefined);
  assertEquals(toIdList(undefined), undefined);
});

Deno.test("encodeId: escapes path separators and keeps digits", () => {
  assertEquals(encodeId(9), "9");
  assertEquals(encodeId(" 9 "), "9");
  assertEquals(encodeId("9/../../me"), "9%2F..%2F..%2Fme");
});

Deno.test("truncate: says how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const out = truncate("x".repeat(50), 10);
  assert(out.startsWith("x".repeat(10)));
  assert(out.includes("50 bytes truncated"), out);
});
