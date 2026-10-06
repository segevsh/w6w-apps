import { assertEquals } from "@std/assert";
import context from "../../actions/get-brand-context.ts";
import { mockCtx, run } from "../_helpers.ts";

const CONTEXT = {
  meta: { domain: "nike.com", canonical_name: "Nike", resolved_at: "2026-10-01T00:00:00Z" },
  identity: { tagline: "Just do it", tags: ["sport"] },
  positioning: { value_proposition: "v", target_audience: [], products_and_services: [] },
  brand: { voice: { summary: "bold" }, style: { summary: "minimal" } },
};

Deno.test("get-brand-context: JSON format asks for application/json and keeps snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: CONTEXT }]);
  const out = await run(context, { domain: "nike.com", format: "json" }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/context/nike.com");
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(out.found, true);
  assertEquals((out.meta as { canonical_name: string }).canonical_name, "Nike");
  assertEquals(out.markdown, undefined);
});

Deno.test("get-brand-context: Markdown format asks for text/markdown and returns the text", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "text/markdown" },
    body: "# Nike\n\nJust do it",
  }]);
  const out = await run(context, { domain: "nike.com", format: "markdown" }, ctx);
  assertEquals(calls[0].headers.accept, "text/markdown");
  assertEquals(out, { found: true, markdown: "# Nike\n\nJust do it" });
});

Deno.test("get-brand-context: cachedOnly 204 is notIndexed; crawl_queued 404 is crawlQueued", async () => {
  const none = mockCtx([{ status: 204 }]);
  const out = await run(context, { domain: "x.com", cachedOnly: true }, none.ctx);
  assertEquals(new URL(none.calls[0].url).searchParams.get("cachedOnly"), "true");
  assertEquals(out, { found: false, notIndexed: true });
  const queued = mockCtx([{
    status: 404,
    headers: { "content-type": "application/json", "x-bf-error": "crawl_queued" },
    body: { message: "Not Found" },
  }]);
  assertEquals(await run(context, { domain: "x.com" }, queued.ctx), {
    found: false,
    crawlQueued: true,
  });
});
