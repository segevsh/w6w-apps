import { assertEquals, assertRejects } from "@std/assert";
import scrape from "../../actions/scrape.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("scrape: POSTs the url and options to /scrape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ markdown: "# Hi" }) }]);
  const out = await scrape.execute(
    { url: "https://example.com", formats: ["markdown", "links"], onlyMainContent: false },
    ctx,
  ) as { markdown: string };

  assertEquals(pathOf(calls[0].url), "/v2/scrape");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.url, "https://example.com");
  assertEquals(body.formats, [{ type: "markdown" }, { type: "links" }]);
  assertEquals(body.onlyMainContent, false);
  assertEquals(out.markdown, "# Hi");
});

Deno.test("scrape: omits unset options entirely rather than sending them as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await scrape.execute({ url: "https://example.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body), ["url"]);
});

Deno.test("scrape: includeTags/excludeTags are split from a comma-separated string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({}) }]);
  await scrape.execute({ url: "https://example.com", includeTags: "article, main" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.includeTags, ["article", "main"]);
});

/**
 * The load-bearing case named in the module doc: a 200 response whose body
 * says `success: false` (e.g. DNS resolution failure) must still surface as a
 * rejected action, not a silently empty result.
 */
Deno.test("scrape: a 200 response with success:false rejects", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: errorBody('DNS resolution failed for hostname "x".', {
      code: "SCRAPE_DNS_RESOLUTION_ERROR",
    }),
  }]);
  await assertRejects(
    () => Promise.resolve(scrape.execute({ url: "https://x.invalid" }, ctx)),
    Error,
    "SCRAPE_DNS_RESOLUTION_ERROR",
  );
});

Deno.test("scrape: is a read, not a perform — no idempotency flag to declare", () => {
  assertEquals(scrape.type, "read");
});
