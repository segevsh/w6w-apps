import { assertEquals, assertRejects } from "@std/assert";
import imageCreateUrl from "../../actions/image-create-url.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-create-url: POSTs the url with page options and parsed headers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i2", url: "https://hcti.io/v1/image/i2" } }]);
  const out = await imageCreateUrl.execute({
    url: "https://example.com",
    full_screen: true,
    block_consent_banners: false,
    headers: '{"x-token":"abc"}',
    viewport_width: 1200,
    viewport_height: 630,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/image");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com",
    full_screen: true,
    block_consent_banners: false,
    headers: { "x-token": "abc" },
    viewport_width: 1200,
    viewport_height: 630,
  });
  assertEquals(out, { id: "i2", url: "https://hcti.io/v1/image/i2" });
});

Deno.test("image-create-url: url is required; a lone viewport side is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await imageCreateUrl.execute({ url: "" }, ctx),
    Error,
    "url is required",
  );
  await assertRejects(
    async () => await imageCreateUrl.execute({ url: "https://a.b", viewport_width: 10 }, ctx),
    Error,
    "supplied together",
  );
  assertEquals(calls.length, 0);
});

Deno.test("image-create-url: a 402 plan limit surfaces with its hint; not idempotent", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: errorBody("Payment Required", "Out of credits", 402),
  }]);
  const err = await assertRejects(
    async () => await imageCreateUrl.execute({ url: "https://a.b" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("Out of credits"), true);
  assertEquals(err.message.includes("image-credit limit"), true);
  assertEquals(imageCreateUrl.idempotent, false);
});
