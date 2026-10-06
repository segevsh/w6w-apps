import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/content-extract.ts";
import { bodyOf, envelope, errorBody, mockCtx, obj, pathOf } from "../_helpers.ts";

Deno.test("content-extract: POSTs /extract and returns the reader-mode fields", async () => {
  const data = {
    url: "https://e.com/p",
    format: "markdown",
    content: "# T",
    title: "T",
    length: 3,
  };
  const { ctx, calls } = mockCtx([{ body: envelope(data) }]);
  const out = await obj(
    await action.execute({
      url: " https://e.com/p ",
      extractFormat: "markdown",
      blockCookieBanners: true,
      hideSelectors: '["#x"]',
      timeout: 20,
    }, ctx),
  );
  assertEquals(pathOf(calls[0].url), "/v1/extract");
  assertEquals(bodyOf(calls[0]), {
    url: "https://e.com/p",
    extractFormat: "markdown",
    blockCookieBanners: true,
    hideSelectors: ["#x"],
    timeout: 20,
  });
  assertEquals(out.content, "# T");
});

Deno.test("content-extract: requires a url; surfaces EXTRACTION_FAILED", async () => {
  const none = mockCtx();
  await assertRejects(
    async () => await action.execute({ url: "" }, none.ctx),
    Error,
    "URL is required",
  );
  const { ctx } = mockCtx([{ status: 422, body: errorBody("EXTRACTION_FAILED", "No content") }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.com" }, ctx),
    Error,
    "EXTRACTION_FAILED",
  );
});
