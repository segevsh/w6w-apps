import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-pdf.ts";

Deno.test("create-pdf: GETs /pdf with the url query param", async () => {
  const body = { url: "https://cdn.opq.to/x.pdf", page_size: "A4" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ url: "https://example.com" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/pdf");
  assertEquals(url.searchParams.get("url"), "https://example.com");
  assertEquals(result, body);
});

Deno.test("create-pdf: accepts html instead of a url", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "x" } }]);
  await action.execute!({ html: "<h1>Hi</h1>" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("html"), "<h1>Hi</h1>");
  assertEquals(url.searchParams.has("url"), false);
});

Deno.test("create-pdf: forwards page/background/force", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "x" } }]);
  await action.execute!(
    { url: "https://example.com", page: "A4", background: true, force: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "A4");
  assertEquals(url.searchParams.get("background"), "yes");
  assertEquals(url.searchParams.get("force"), "yes");
});

Deno.test("create-pdf: throws locally when neither url nor html is provided", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute!({}, ctx);
    },
    Error,
    "provide either url or html",
  );
});
