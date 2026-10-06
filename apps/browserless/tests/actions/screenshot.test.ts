import { assert, assertEquals, assertRejects } from "@std/assert";
import screenshot from "../../actions/screenshot.ts";
import { mockCtx, region } from "../_helpers.ts";

const PNG = new Uint8Array([137, 80, 78, 71]);

Deno.test("screenshot: posts to the connection's region and returns base64", async () => {
  const { ctx, calls } = mockCtx(
    [{ headers: { "content-type": "image/png" }, body: PNG }],
    { connection: region("lon") },
  );
  const out = await screenshot.execute(
    { url: " https://example.com ", type: "png", fullPage: true, waitUntil: "networkidle2" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(out, { contentType: "image/png", sizeBytes: 4, base64: "iVBORw==" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://production-lon.browserless.io/screenshot");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com",
    gotoOptions: { waitUntil: "networkidle2" },
    options: { type: "png", fullPage: true },
  });
  assert(!calls[0].url.includes("token"));
});

Deno.test("screenshot: query params and requestOverrides reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "image/jpeg" }, body: PNG }]);
  await screenshot.execute(
    {
      html: "<b>hi</b>",
      type: "jpeg",
      quality: 80,
      timeout: 20000,
      proxy: "datacenter",
      proxyCountry: "GB",
      requestOverrides: '{"emulateMediaType":"print"}',
    },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://production-sfo.browserless.io/screenshot?timeout=20000&proxy=datacenter&proxyCountry=gb",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.emulateMediaType, "print");
  assertEquals(body.options, { type: "jpeg", quality: 80 });
});

Deno.test("screenshot: rejects url+html, neither, and quality on png without calling", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await screenshot.execute({ url: "https://a.com", html: "<p/>" }, ctx),
    Error,
    "not both",
  );
  await assertRejects(async () => await screenshot.execute({}, ctx), Error, "URL or HTML");
  await assertRejects(
    async () => await screenshot.execute({ url: "https://a.com", type: "png", quality: 50 }, ctx),
    Error,
    "JPEG and WebP",
  );
  assertEquals(calls.length, 0);
});

Deno.test("screenshot: a 408 is a thrown error with the timeout hint", async () => {
  const { ctx } = mockCtx([{ status: 408, body: "Request has timed out" }]);
  await assertRejects(
    async () => await screenshot.execute({ url: "https://a.com" }, ctx),
    Error,
    "408",
  );
});
