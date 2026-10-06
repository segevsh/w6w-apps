import { assertEquals, assertRejects } from "@std/assert";
import scrape, { parseSelectors } from "../../actions/scrape.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("scrape: one element entry per selector line", async () => {
  const data = { data: [{ selector: "h1", results: [{ text: "Hi" }] }] };
  const { ctx, calls } = mockCtx([{ body: data }]);
  const out = await scrape.execute({ url: "https://a.com", selectors: "h1\n\n  .x a \n" }, ctx);
  assertEquals(out, data);
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/scrape");
  assertEquals(JSON.parse(calls[0].body!).elements, [{ selector: "h1" }, { selector: ".x a" }]);
});

Deno.test("scrape: parseSelectors drops blanks", () => {
  assertEquals(parseSelectors(" \n"), []);
});

Deno.test("scrape: needs a selector", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await scrape.execute({ url: "https://a.com", selectors: " " }, ctx),
    Error,
    "at least one CSS selector",
  );
  assertEquals(calls.length, 0);
});

Deno.test("scrape: a non-JSON 200 is reported, not swallowed", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html>nope" }]);
  await assertRejects(
    async () => await scrape.execute({ url: "https://a.com", selectors: "h1" }, ctx),
    Error,
    "expected JSON",
  );
});
