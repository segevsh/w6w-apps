import { assertEquals, assertRejects } from "@std/assert";
import unblock from "../../actions/unblock.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("unblock: requests content by default and passes the payload through", async () => {
  const payload = { content: "<html/>", cookies: [], screenshot: null, browserWSEndpoint: null };
  const { ctx, calls } = mockCtx([{ body: payload }]);
  const out = await unblock.execute({
    url: "https://a.com",
    proxy: "residential",
    proxyCountry: "US",
  }, ctx);
  assertEquals(out, payload);
  assertEquals(
    calls[0].url,
    "https://production-sfo.browserless.io/unblock?proxy=residential&proxyCountry=us",
  );
  assertEquals(JSON.parse(calls[0].body!), { url: "https://a.com", content: true });
});

Deno.test("unblock: flags, ttl and overrides map to the body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await unblock.execute(
    {
      url: "https://a.com",
      content: false,
      cookies: true,
      screenshot: true,
      browserWSEndpoint: true,
      ttl: 5000,
      requestOverrides: { waitForTimeout: 1 },
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://a.com",
    content: false,
    cookies: true,
    screenshot: true,
    browserWSEndpoint: true,
    ttl: 5000,
    waitForTimeout: 1,
  });
});

Deno.test("unblock: needs a URL", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await unblock.execute({ url: " " }, ctx),
    Error,
    "URL is required",
  );
});
