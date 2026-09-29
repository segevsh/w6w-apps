import { assertEquals } from "@std/assert";
import lookup from "../../actions/lookup.ts";
import { mockCtx, pathOf, queryOf, withCredits } from "../_helpers.ts";

Deno.test("lookup: builds the request against /v2/lookup/ with comma-joined urls", async () => {
  const { ctx, calls } = mockCtx([
    withCredits([{ url: "https://example.com", technologies: [] }], 1, 99999),
  ]);
  await lookup.execute({ urls: "https://example.com, https://example.org" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/lookup/");
  assertEquals(calls[0].method, "GET");
  assertEquals(queryOf(calls[0].url).urls, "https://example.com,https://example.org");
});

Deno.test("lookup: omits optional query params when unset", async () => {
  const { ctx, calls } = mockCtx([withCredits([], 1, 99999)]);
  await lookup.execute({ urls: "https://example.com" }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(Object.keys(query).sort(), ["urls"]);
});

Deno.test("lookup: passes live/recursive/sets/age params through when set", async () => {
  const { ctx, calls } = mockCtx([withCredits([], 5, 99995)]);
  await lookup.execute({
    urls: "https://example.com",
    live: true,
    recursive: false,
    sets: "company, contact",
    denoise: false,
    minAge: 1,
    maxAge: 12,
    squash: false,
    callbackUrl: "https://yourdomain.com/wappalyzer",
    debugEmail: "debug@example.com",
  }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(query.live, "true");
  assertEquals(query.recursive, "false");
  assertEquals(query.sets, "company,contact");
  assertEquals(query.denoise, "false");
  assertEquals(query.min_age, "1");
  assertEquals(query.max_age, "12");
  assertEquals(query.squash, "false");
  assertEquals(query.callback_url, "https://yourdomain.com/wappalyzer");
  assertEquals(query.debug_email, "debug@example.com");
});

/**
 * The vendor documents three shapes sharing one array — completed, pending
 * (`crawl: true`), and per-URL error. This action passes all three through
 * unchanged rather than picking one to normalize toward.
 */
Deno.test("lookup: passes completed, pending and error items through unchanged", async () => {
  const items = [
    { url: "https://example.com", technologies: [{ slug: "craft-cms", name: "Craft CMS" }] },
    { url: "https://example.org", technologies: [], crawl: true },
    { url: "https://bad.example", errors: ["Something went wrong"] },
  ];
  const { ctx } = mockCtx([withCredits(items, 3, 99997)]);
  const out = await lookup.execute({ urls: "https://example.com" }, ctx) as {
    results: unknown[];
    creditsSpent: number;
    creditsRemaining: number;
  };

  assertEquals(out.results, items);
  assertEquals(out.creditsSpent, 3);
  assertEquals(out.creditsRemaining, 99997);
});

Deno.test("lookup: an empty response body is reported as an empty results array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await lookup.execute({ urls: "https://example.com" }, ctx) as { results: unknown[] };
  assertEquals(out.results, []);
});

Deno.test("lookup: urls is required", () => {
  const urlsParam = lookup.params?.find((p) => p.key === "urls");
  assertEquals(urlsParam?.required, true);
});
