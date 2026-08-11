import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  asOptionalJson,
  buildQuery,
  compact,
  COMPANY_ID_HEADER,
  encodeId,
  extractMessage,
  formatHousecallError,
  HousecallClient,
  normalizeList,
  toList,
  truncate,
} from "../../lib/client.ts";
import { mockCtx, page, priceBookPage } from "../_helpers.ts";

Deno.test("client: the origin is the bare host, with no version prefix", () => {
  assertEquals(API_BASE, "https://api.housecallpro.com");
});

// --- query building --------------------------------------------------------

Deno.test("buildQuery: arrays are repeated under a bracketed key", () => {
  assertEquals(
    decodeURIComponent(buildQuery({ work_status: ["scheduled", "completed"] }).toString()),
    "work_status[]=scheduled&work_status[]=completed",
  );
});

Deno.test("buildQuery: scalars keep their plain key", () => {
  assertEquals(buildQuery({ page: 2, q: "ada" }).toString(), "page=2&q=ada");
});

Deno.test("buildQuery: false and zero survive, undefined and empty string do not", () => {
  assertEquals(
    buildQuery({ a: false, b: 0, c: undefined, d: null, e: "" }).toString(),
    "a=false&b=0",
  );
});

Deno.test("buildQuery: an empty array sends nothing, not an empty bracketed value", () => {
  assertEquals(buildQuery({ tags: [] }).toString(), "");
  assertEquals(buildQuery({ tags: ["a", "", "b"] }).getAll("tags[]"), ["a", "b"]);
});

// --- list normalisation ----------------------------------------------------

Deno.test("normalizeList: the core envelope, keyed by the plural resource name", () => {
  assertEquals(normalizeList(page("customers", [{ id: "c1" }]), "customers"), {
    items: [{ id: "c1" }],
    page: 1,
    pageSize: 50,
    totalPages: 1,
    totalItems: 1,
  });
});

/**
 * The price-book envelope names its counts differently AND puts the rows under
 * `data`. Reading it with the core field names would report `totalItems`
 * undefined and, worse, `items: []`.
 */
Deno.test("normalizeList: the price-book envelope maps total_count and data", () => {
  assertEquals(normalizeList(priceBookPage([{ uuid: "m1" }, { uuid: "m2" }]), "materials"), {
    items: [{ uuid: "m1" }, { uuid: "m2" }],
    page: 1,
    pageSize: 50,
    totalPages: 1,
    totalItems: 2,
  });
});

Deno.test("normalizeList: an unenveloped sub-resource yields items and no page fields", () => {
  const out = normalizeList({ url: "/x", data: [{ id: "li1" }] }, "line_items");
  assertEquals(out.items, [{ id: "li1" }]);
  assertEquals(out.page, undefined);
  assertEquals(out.totalItems, undefined);
});

Deno.test("normalizeList: a bare array and a junk body both stay safe", () => {
  assertEquals(normalizeList([{ id: 1 }], "anything").items, [{ id: 1 }]);
  assertEquals(normalizeList(null, "anything").items, []);
  assertEquals(normalizeList("nope", "anything").items, []);
  assertEquals(normalizeList({ customers: "not an array" }, "customers").items, []);
});

// --- error formatting ------------------------------------------------------

/**
 * All five shapes the reference and the wire produce. A formatter that read only
 * one would drop the field name from a 422, which is the only part of that body
 * worth having.
 */
Deno.test("extractMessage: reads all five documented error shapes", () => {
  assertEquals(extractMessage({ message: "Unauthorized" }), "Unauthorized");
  assertEquals(extractMessage({ error: { message: "Job not found" } }), "Job not found");
  assertEquals(extractMessage({ error: "price_form not found" }), "price_form not found");
  assertEquals(
    extractMessage({ errors: { name: ["can't be blank"], zip: ["is invalid"] } }),
    "name: can't be blank; zip: is invalid",
  );
  assertEquals(
    extractMessage({ message: "Validation failed", unit_price: ["is not a number"] }),
    "Validation failed (unit_price: is not a number)",
  );
});

Deno.test("extractMessage: an unrecognised body yields the empty string, not a guess", () => {
  assertEquals(extractMessage({}), "");
  assertEquals(extractMessage({ nothing: "useful" }), "");
});

Deno.test("formatHousecallError: a 401 names both causes, because the body cannot tell", () => {
  const msg = formatHousecallError(401, "GET", "/company", '{"message":"Unauthorized"}');
  assert(msg.includes("401"));
  assert(msg.includes("identical body for a missing and for a rejected credential"));
});

Deno.test("formatHousecallError: a 403 points at the location hierarchy", () => {
  const msg = formatHousecallError(403, "GET", "/routes", '{"message":"Forbidden"}');
  assert(msg.includes("X-Company-Id"));
});

Deno.test("formatHousecallError: a non-JSON body is passed through rather than swallowed", () => {
  const msg = formatHousecallError(502, "GET", "/jobs", "<html>bad gateway</html>");
  assert(msg.includes("502"));
  assert(msg.includes("bad gateway"));
});

// --- small helpers ---------------------------------------------------------

Deno.test("compact: drops unset keys and keeps meaningful falsy ones", () => {
  assertEquals(compact({ a: 1, b: false, c: 0, d: undefined, e: null, f: "" }), {
    a: 1,
    b: false,
    c: 0,
  });
});

Deno.test("toList: splits a comma string, passes an array through, drops empties", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(",,"), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("asOptionalJson: accepts a string or a parsed value, and names its field on failure", () => {
  assertEquals(asOptionalJson('{"a":1}', "Schedule"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "Schedule"), { a: 1 });
  assertEquals(asOptionalJson("", "Schedule"), undefined);
  try {
    asOptionalJson("{oops", "Schedule");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Schedule is not valid JSON");
  }
});

Deno.test("encodeId: neutralises path separators but leaves an ordinary id alone", () => {
  assertEquals(encodeId("abc-123"), "abc-123");
  assertEquals(encodeId(" abc "), "abc");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("truncate: says how much it dropped", () => {
  const out = truncate("x".repeat(700));
  assert(out.startsWith("x".repeat(600)));
  assert(out.includes("700 bytes truncated"));
});

// --- the request itself ----------------------------------------------------

Deno.test("client: no request carries an Authorization header — signing is the auth hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page("jobs", []) }]);
  await new HousecallClient(ctx).list("/jobs", "jobs", { companyId: "loc-1" });

  assertEquals(Object.keys(calls[0].headers).sort(), ["accept", COMPANY_ID_HEADER]);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: a JSON body sets content-type and is serialized once", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new HousecallClient(ctx).json("/tags", { method: "POST", body: { name: "VIP" } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"VIP"}');
});

Deno.test("client: a 204 and an empty body both read as undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new HousecallClient(ctx);
  assertEquals(await client.json("/x"), undefined);
  assertEquals(await client.json("/y"), undefined);
});

Deno.test("client: a non-2xx throws with the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { message: "Job not found" } } }]);
  await assertRejects(
    async () => {
      await new HousecallClient(ctx).json("/jobs/nope");
    },
    Error,
    "Job not found",
  );
});
