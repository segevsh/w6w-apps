import { assertEquals, assertRejects } from "@std/assert";
import {
  asRegion,
  BrowserlessClient,
  compact,
  errorText,
  filenameFromDisposition,
  formatError,
  HOSTS,
  readBody,
  regionFromConnection,
  toBase64,
  truncate,
} from "../../lib/client.ts";
import { buildPageBody, buildQuery } from "../../lib/params.ts";
import { mockCtx, region } from "../_helpers.ts";

Deno.test("client: region defaults to sfo and rejects unknown values", () => {
  assertEquals(asRegion(undefined), "sfo");
  assertEquals(asRegion("mars"), "sfo");
  assertEquals(regionFromConnection(region("ams") as never), "ams");
  assertEquals(HOSTS.lon, "production-lon.browserless.io");
});

Deno.test("client: errorText reads all three of the vendor's error shapes", () => {
  assertEquals(errorText('{"error":"Invalid API token"}'), "Invalid API token");
  assertEquals(errorText("Invalid API key. Please check."), "Invalid API key. Please check.");
  assertEquals(
    errorText("<html><title>401 Authorization Required</title></html>"),
    "401 Authorization Required",
  );
  assertEquals(errorText(""), "");
  assertEquals(formatError(408, "POST", "/pdf", "timed out").includes("bestAttempt"), true);
});

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: false }), { a: 1, d: false });
  assertEquals(truncate("abcdef", 3), "abc… (6 chars truncated)");
  assertEquals(toBase64(new Uint8Array(70000).fill(65)).length, 93336);
  assertEquals(filenameFromDisposition('attachment; filename="a b.zip"'), "a b.zip");
  assertEquals(filenameFromDisposition(null), undefined);
});

Deno.test("client: readBody branches on content type", async () => {
  const j = await readBody(
    new Response('{"a":1}', { headers: { "content-type": "application/json" } }),
  );
  assertEquals(j.data, { a: 1 });
  const t = await readBody(new Response("hi", { headers: { "content-type": "text/plain" } }));
  assertEquals(t.text, "hi");
  const b = await readBody(
    new Response(new Uint8Array([1]), { headers: { "content-type": "image/png" } }),
  );
  assertEquals(b.base64, "AQ==");
});

Deno.test("client: never adds a token itself and accept lets a status through", async () => {
  const { ctx, calls } = mockCtx([{ status: 409, body: "x" }]);
  const res = await new BrowserlessClient(ctx).response("/crawl/x", {
    method: "DELETE",
    accept: [409],
  });
  assertEquals(res.status, 409);
  assertEquals(calls[0].url.includes("token"), false);
  const bad = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(async () => await new BrowserlessClient(bad.ctx).json("/x"), Error, "boom");
});

Deno.test("params: buildQuery and buildPageBody drop unset fields", () => {
  assertEquals(buildQuery({ proxySticky: false }), {});
  assertEquals(buildPageBody({}), {});
});
