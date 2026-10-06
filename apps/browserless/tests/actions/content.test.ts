import { assertEquals, assertRejects } from "@std/assert";
import content from "../../actions/content.ts";
import { mockCtx, region } from "../_helpers.ts";

Deno.test("content: returns rendered HTML with its type and size", async () => {
  const { ctx, calls } = mockCtx(
    [{ headers: { "content-type": "text/html; charset=utf-8" }, body: "<html>é</html>" }],
    { connection: region("ams") },
  );
  const out = await content.execute({ url: "https://example.com", bestAttempt: true }, ctx);
  assertEquals(out, {
    html: "<html>é</html>",
    contentType: "text/html; charset=utf-8",
    sizeBytes: 15,
  });
  assertEquals(calls[0].url, "https://production-ams.browserless.io/content");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://example.com", bestAttempt: true });
});

Deno.test("content: viewport needs both dimensions", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await content.execute({ url: "https://a.com", viewportWidth: 800 }, ctx),
    Error,
    "both viewport width and viewport height",
  );
  assertEquals(calls.length, 0);
});

Deno.test("content: wait options, headers and viewport map to the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "text/html" }, body: "x" }]);
  await content.execute(
    {
      url: "https://a.com",
      waitForSelector: "#app",
      waitForTimeout: 500,
      rejectResourceTypes: ["image"],
      userAgent: "UA",
      extraHeaders: { "x-a": "1" },
      viewportWidth: 1280,
      viewportHeight: 720,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://a.com",
    waitForSelector: { selector: "#app" },
    waitForTimeout: 500,
    rejectResourceTypes: ["image"],
    userAgent: { userAgent: "UA" },
    setExtraHTTPHeaders: { "x-a": "1" },
    viewport: { width: 1280, height: 720 },
  });
});

Deno.test("content: a 401 names the rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid API key. Please check your API key." }]);
  await assertRejects(
    async () => await content.execute({ url: "https://a.com" }, ctx),
    Error,
    "reconnect",
  );
});
