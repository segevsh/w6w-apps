import { assertEquals, assertRejects } from "@std/assert";
import fetchPage from "../../actions/fetch.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("fetch: posts only what is set and returns the page fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: { markdown: "# hi", favicon: "https://f/i.ico", images: [{ alt: "a", url: "u" }] },
  }]);
  const out = await fetchPage.execute({
    url: " https://example.com ",
    renderJs: true,
    mode: "pro",
    extractImages: true,
  }, ctx);
  assertEquals(out.markdown, "# hi");
  assertEquals(out.images, [{ alt: "a", url: "u" }]);
  assertEquals(calls[0].url, "https://api.linkup.so/v1/fetch");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com",
    renderJs: true,
    mode: "pro",
    extractImages: true,
  });
});

Deno.test("fetch: a schema goes as an object, with instructions", async () => {
  const { ctx, calls } = mockCtx([{ body: { markdown: "", favicon: "", data: { a: 1 } } }]);
  const out = await fetchPage.execute({
    url: "https://e.com",
    schema: '{"type":"object"}',
    instructions: "one per city",
    includeRawContent: true,
  }, ctx);
  assertEquals(out.data, { a: 1 });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.schema, { type: "object" });
  assertEquals(body.instructions, "one per city");
  assertEquals(body.includeRawContent, true);
});

Deno.test("fetch: validation and vendor errors", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: { statusCode: 400, error: { code: "BAD_REQUEST", message: "unreachable" } },
  }]);
  await assertRejects(
    async () => await fetchPage.execute({ url: "" }, ctx),
    Error,
    "URL is required",
  );
  await assertRejects(
    async () => await fetchPage.execute({ url: "u", instructions: "x" }, ctx),
    Error,
    "need a schema",
  );
  await assertRejects(
    async () => await fetchPage.execute({ url: "u", mode: "x" }, ctx),
    Error,
    "mode",
  );
  assertEquals(calls.length, 0);
  await assertRejects(
    async () => await fetchPage.execute({ url: "https://e.com" }, ctx),
    Error,
    "unreachable",
  );
});
