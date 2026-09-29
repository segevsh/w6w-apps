import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  asOptionalJson,
  compact,
  formatWappalyzerError,
  joinList,
  listPath,
  PATHS,
  toStringList,
  WappalyzerClient,
} from "../../lib/client.ts";
import { mockCtx, pathOf, withCredits } from "../_helpers.ts";

Deno.test("API_BASE/API_PREFIX/PATHS: the one documented origin and version prefix", () => {
  assertEquals(API_BASE, "https://api.wappalyzer.com");
  assertEquals(API_PREFIX, "/v2");
  // Collection endpoints carry a trailing slash in every worked example.
  assertEquals(PATHS.lookup, "/lookup/");
  assertEquals(PATHS.subdomains, "/subdomains/");
  assertEquals(PATHS.verify, "/verify/");
  assertEquals(PATHS.creditsBalance, "/credits/balance/");
  assertEquals(PATHS.lists, "/lists/");
});

Deno.test("listPath: never a trailing slash, and escapes the id", () => {
  assertEquals(listPath("lst_abcdef"), "/lists/lst_abcdef");
  assertEquals(listPath(" lst_abcdef "), "/lists/lst_abcdef");
  assertEquals(listPath("weird/id"), "/lists/weird%2Fid");
});

Deno.test("joinList: comma-joins and trims, matching style:form explode:false", () => {
  assertEquals(joinList("https://a.com, https://b.com"), "https://a.com,https://b.com");
  assertEquals(joinList(["a", " b ", ""]), "a,b");
  assertEquals(joinList(undefined), undefined);
  assertEquals(joinList(""), undefined);
});

Deno.test("compact: drops undefined/null/empty-string but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toStringList: normalises an array or comma string, dropping blanks", () => {
  assertEquals(toStringList([" a ", "", "b"]), ["a", "b"]);
  assertEquals(toStringList("a, b"), ["a", "b"]);
  assertEquals(toStringList(undefined), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes a non-string through, rejects garbage", () => {
  assertEquals(asOptionalJson('[{"slug":"shopify"}]', "technologies"), [{ slug: "shopify" }]);
  assertEquals(asOptionalJson([{ slug: "shopify" }], "technologies"), [{ slug: "shopify" }]);
  assertEquals(asOptionalJson(undefined, "technologies"), undefined);
  assertEquals(asOptionalJson("", "technologies"), undefined);
  let threw = false;
  try {
    asOptionalJson("{not json", "technologies");
  } catch {
    threw = true;
  }
  assert(threw, "invalid JSON should throw");
});

/**
 * The vendor's only documented error shape is `{"message": "..."}` — no
 * separate machine-readable error `type`/`code`, unlike some other vendors in
 * this pack. `formatWappalyzerError` therefore leans on the status code for
 * category and the message for detail.
 */
Deno.test("formatWappalyzerError: reads the vendor's message and adds a 403/429 hint", () => {
  const msg403 = formatWappalyzerError(
    403,
    "GET",
    "/v2/lookup/",
    JSON.stringify({ message: "Forbidden" }),
  );
  assert(msg403.includes("403"));
  assert(msg403.includes("Forbidden"));
  assert(/insufficient credits/i.test(msg403));

  const msg429 = formatWappalyzerError(429, "GET", "/v2/verify/", "");
  assert(/rate limit/i.test(msg429));
});

Deno.test("formatWappalyzerError: falls back to the raw body when it is not JSON", () => {
  const msg = formatWappalyzerError(500, "GET", "/v2/lookup/", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("WappalyzerClient.get: reads the credit headers off a successful response", async () => {
  const { ctx, calls } = mockCtx([withCredits({ credits: 5 }, 1, 4)]);
  const client = new WappalyzerClient(ctx);
  const result = await client.get<{ credits: number }>(PATHS.creditsBalance);

  assertEquals(pathOf(calls[0].url), "/v2/credits/balance/");
  assertEquals(result.data, { credits: 5 });
  assertEquals(result.creditsSpent, 1);
  assertEquals(result.creditsRemaining, 4);
});

Deno.test("WappalyzerClient.get: a response with no credit headers omits them, not NaN", async () => {
  const { ctx } = mockCtx([{ body: { credits: 5 } }]);
  const client = new WappalyzerClient(ctx);
  const result = await client.get<{ credits: number }>(PATHS.creditsBalance);

  assertEquals("creditsSpent" in result, false);
  assertEquals("creditsRemaining" in result, false);
});

Deno.test("WappalyzerClient: a non-ok response throws a formatted error, not a raw fetch failure", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  const client = new WappalyzerClient(ctx);
  await assertRejects(
    () => client.get(PATHS.lookup, { urls: "https://example.com" }),
    Error,
    "403",
  );
});

Deno.test("WappalyzerClient.post: sends a JSON body with the right content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "lst_abcdef", status: "Calculating" } }]);
  const client = new WappalyzerClient(ctx);
  await client.post(PATHS.lists, { technologies: [{ slug: "shopify" }] });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { technologies: [{ slug: "shopify" }] });
});

Deno.test("WappalyzerClient.delete: sends no body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new WappalyzerClient(ctx);
  await client.delete(listPath("lst_abcdef"));

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});
