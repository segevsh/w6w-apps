import { assertEquals, assertRejects } from "@std/assert";
import tx from "../../actions/get-brand-from-transaction.ts";
import { mockCtx, run } from "../_helpers.ts";
import { BRAND } from "../_fixtures.ts";

Deno.test("get-brand-from-transaction: POSTs the label and an upper-cased country", async () => {
  const { ctx, calls } = mockCtx([{ body: BRAND }]);
  const out = await run(tx, { transactionLabel: "NIKE STORE 123", countryCode: " us " }, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/brands/transaction");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    transactionLabel: "NIKE STORE 123",
    countryCode: "US",
  });
  assertEquals(out.found, true);
  assertEquals(out.domain, "nike.com");
});

Deno.test("get-brand-from-transaction: crawl_queued 404 is a result; a plain 404 throws", async () => {
  const queued = mockCtx([{
    status: 404,
    headers: { "content-type": "application/json", "x-bf-error": "crawl_queued" },
    body: { message: "Not Found" },
  }]);
  assertEquals(await run(tx, { transactionLabel: "x", countryCode: "US" }, queued.ctx), {
    found: false,
    crawlQueued: true,
  });
  const nf = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(
    () => run(tx, { transactionLabel: "x", countryCode: "US" }, nf.ctx),
    Error,
    "404",
  );
});
