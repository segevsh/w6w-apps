import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/crawl-create.ts";
import { mockCtx, run } from "../_helpers.ts";
import { CRAWL_JOB } from "../_fixtures.ts";

Deno.test("crawl-create: POSTs a form-encoded body, never JSON", async () => {
  const { ctx, calls } = mockCtx([{
    body: { response: "Successfully added urls for spidering.", jobs: [CRAWL_JOB] },
  }]);
  const out = await run(action, {
    name: "test-crawl",
    seeds: " https://example.com ",
    apiUrl: "https://api.diffbot.com/v3/analyze",
    maxToProcess: 50,
    obeyRobots: false,
    useProxies: true,
    maxHops: 0,
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/crawl");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("name"), "test-crawl");
  assertEquals(form.get("seeds"), "https://example.com");
  assertEquals(form.get("apiUrl"), "https://api.diffbot.com/v3/analyze");
  assertEquals(form.get("maxToProcess"), "50");
  assertEquals(form.get("obeyRobots"), "0");
  assertEquals(form.get("useProxies"), "1");
  assertEquals(form.get("maxHops"), "0");
  assertEquals(form.has("maxToCrawl"), false);
  assertEquals(out.name, "test-crawl");
  assertEquals(out.statusCode, 7);
  assertEquals(out.statusMessage, "Job in progress");
});

Deno.test("crawl-create: token-bearing download URLs are stripped from the returned job", async () => {
  const { ctx } = mockCtx([{ body: { response: "ok", jobs: [CRAWL_JOB] } }]);
  const out = await run(action, {
    name: "test-crawl",
    seeds: "https://e.com",
    apiUrl: "https://api.diffbot.com/v3/analyze",
  }, ctx);
  assert(!JSON.stringify(out).includes("SECRETTOKEN"));
  assertEquals("downloadJson" in (out.job as object), false);
  assertEquals("downloadUrls" in (out.job as object), false);
});

Deno.test("crawl-create: a vendor error is thrown", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorCode: 401, error: "Not authorized API token." },
  }]);
  await assertRejects(
    () => run(action, { name: "n", seeds: "https://e.com", apiUrl: "u" }, ctx),
    Error,
    "Not authorized",
  );
});
