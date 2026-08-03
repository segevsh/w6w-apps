import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_URL,
  FlodeskClient,
  OAUTH_BASE,
  PAGE_PARAMS,
  pageQuery,
  readRateLimit,
  USER_AGENT,
  WORKFLOW_PAGE_PARAMS,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: the base URL is Flodesk's single documented server", () => {
  assertEquals(API_URL, "https://api.flodesk.com/v1");
  // OAuth lives on the same host but outside the /v1 prefix.
  assertEquals(OAUTH_BASE, "https://api.flodesk.com/oauth2");
});

Deno.test("client: url() joins relative paths and passes absolutes through", () => {
  assertEquals(FlodeskClient.url("/segments"), "https://api.flodesk.com/v1/segments");
  assertEquals(FlodeskClient.url("https://example.com/x"), "https://example.com/x");
});

Deno.test("client: seg() percent-encodes an email used as a path segment", () => {
  assertEquals(FlodeskClient.seg("a+b@example.com"), "a%2Bb%40example.com");
  assertEquals(FlodeskClient.seg("61b2c3"), "61b2c3");
});

Deno.test("client: sends the documented User-Agent and never an Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new FlodeskClient(ctx).request("/segments");

  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  assertEquals(calls[0].headers["accept"], "application/json");
  // Signing is the auth hook's job; the client must never do it.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await new FlodeskClient(ctx).request("/segments", { method: "POST", body: { name: "VIP" } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "VIP" }));
});

Deno.test("client: sends a body on DELETE — Flodesk's segment-removal shape", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new FlodeskClient(ctx).request("/subscribers/x/segments", {
    method: "DELETE",
    body: { segment_ids: ["a"] },
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, JSON.stringify({ segment_ids: ["a"] }));
});

Deno.test("client: drops undefined, null and empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new FlodeskClient(ctx).request("/subscribers", {
    query: { page: 2, per_page: undefined, status: "", segment_id: null },
  });
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/subscribers?page=2");
});

Deno.test("client: throws with status and body detail on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "not_found", message: "nope" } }]);
  const err = await assertRejects(
    () => new FlodeskClient(ctx).request("/segments/zzz"),
    Error,
  );
  assert(err.message.includes("404"));
  assert(err.message.includes("not_found"));
  assert(err.message.includes("/segments/zzz"));
});

Deno.test("client: returns undefined for a 204 and for an empty body", async () => {
  const a = mockCtx([{ status: 204 }]);
  assertEquals(
    await new FlodeskClient(a.ctx).request("/webhooks/1", { method: "DELETE" }),
    undefined,
  );

  const b = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await new FlodeskClient(b.ctx).request("/x"), undefined);
});

Deno.test("client: send() returns the raw response without throwing", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "slow down" } }]);
  const res = await new FlodeskClient(ctx).send("/segments/colors");
  assertEquals(res.status, 429);
});

Deno.test("pageQuery: maps perPage onto Flodesk's per_page", () => {
  assertEquals(pageQuery({ page: 3, perPage: 50 }), { page: 3, per_page: 50 });
  assertEquals(pageQuery({}), { page: undefined, per_page: undefined });
});

Deno.test("page params: the shared fragment documents Flodesk's real defaults", () => {
  const perPage = PAGE_PARAMS.find((p) => p.key === "perPage")!;
  assertEquals(perPage.validation?.max, 100, "Flodesk caps per_page at 100");
  // The workflow variant is a genuinely different endpoint contract.
  const wfPerPage = WORKFLOW_PAGE_PARAMS.find((p) => p.key === "perPage")!;
  assert(!("max" in (wfPerPage.validation as object)), "no documented cap on /workflows");
  assert(wfPerPage.hint?.includes("perPage"), "the camelCase quirk must be surfaced to the user");
});

Deno.test("readRateLimit: reads Flodesk's X-Fd-RateLimit-* headers", () => {
  const headers = new Headers({
    "X-Fd-RateLimit-Limit": "100",
    "X-Fd-RateLimit-Remaining": "68",
  });
  assertEquals(readRateLimit(headers), { limit: 100, remaining: 68 });
});

Deno.test("readRateLimit: yields undefined rather than 0 when headers are absent", () => {
  assertEquals(readRateLimit(new Headers()), { limit: undefined, remaining: undefined });
  // A blank or non-numeric header must not read as a real 0 of headroom.
  assertEquals(
    readRateLimit(new Headers({ "X-Fd-RateLimit-Remaining": "n/a" })).remaining,
    undefined,
  );
});

Deno.test("readRateLimit: reads a genuine zero as zero", () => {
  assertEquals(readRateLimit(new Headers({ "X-Fd-RateLimit-Remaining": "0" })).remaining, 0);
});
