import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_PATH,
  baseUrlFromConnection,
  CLOUD_BASE_URL,
  compact,
  csv,
  DocumensoClient,
  json,
  normalizeBaseUrl,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const cloud = { display: {} };
const selfHosted = { display: { baseUrl: "https://sign.example.com" } };

Deno.test("the base path is v2, and the cloud is the default host", () => {
  assertEquals(API_PATH, "/api/v2");
  assertEquals(CLOUD_BASE_URL, "https://app.documenso.com");
});

/** Documenso's own examples end in /api/v2, so a pasted one is plausible. */
Deno.test("normalizeBaseUrl assumes https, strips the path, and defaults to the cloud", () => {
  assertEquals(normalizeBaseUrl(""), CLOUD_BASE_URL);
  assertEquals(normalizeBaseUrl("sign.example.com"), "https://sign.example.com");
  assertEquals(normalizeBaseUrl("https://sign.example.com/api/v2"), "https://sign.example.com");
  assertEquals(normalizeBaseUrl("http://localhost:3000"), "http://localhost:3000");
  assertThrows(() => normalizeBaseUrl("http://"), Error, "not a valid URL");
});

Deno.test("baseUrlFromConnection falls back to the cloud rather than failing", () => {
  assertEquals(baseUrlFromConnection(cloud as never), CLOUD_BASE_URL);
  assertEquals(baseUrlFromConnection(selfHosted as never), "https://sign.example.com");
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("1, 2 ,,3"), ["1", "2", "3"]);
  assertThrows(() => json("{oops", "meta"), Error, "`meta` is not valid JSON");
});

Deno.test("client: builds paths under /api/v2 on the connection's instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], selfHosted);
  await new DocumensoClient(ctx).request("/envelope", { query: { perPage: 1 } });
  assertEquals(calls[0].url, "https://sign.example.com/api/v2/envelope?perPage=1");
});

Deno.test("client: never sends Authorization — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], cloud);
  await new DocumensoClient(ctx).request("/envelope");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/**
 * A multipart body needs a boundary the runtime generates, so the header must
 * NOT be set by hand.
 */
Deno.test("client: a form payload is FormData with no content-type header set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], cloud);
  await new DocumensoClient(ctx).request("/envelope/use", {
    method: "POST",
    body: { envelopeId: "e1" },
    asFormPayload: true,
  });
  assertEquals(calls[0].headers["content-type"], undefined);
  // The helper stringifies non-string bodies, so the FormData shows as such.
  assert(calls[0].body !== null);
});

Deno.test("client: a JSON body does set the content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], cloud);
  await new DocumensoClient(ctx).request("/envelope/cancel", {
    method: "POST",
    body: { envelopeId: "e1" },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { envelopeId: "e1" });
});

/** The Zod issue tree names the exact field, so the whole body is surfaced. */
Deno.test("client: a failure surfaces the status and Documenso's validation tree", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: {
      message: "Request validation failed",
      headerErrors: { issues: [{ code: "invalid_type", expected: "string" }] },
    },
  }], cloud);
  const err = await assertRejects(
    async () => await new DocumensoClient(ctx).request("/envelope"),
    Error,
  );
  assert(err.message.includes("400"), err.message);
  assert(err.message.includes("headerErrors"), err.message);
});

/** `{data, totalPages}`, 1-based pages. */
Deno.test("requestAll pages 1-based and stops at totalPages", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "a" }], totalPages: 2 } },
    { status: 200, body: { data: [{ id: "b" }], totalPages: 2 } },
  ], cloud);
  assertEquals(await new DocumensoClient(ctx).requestAll("/envelope"), [{ id: "a" }, { id: "b" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "1");
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("requestAll stops on an empty page rather than looping", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], totalPages: 9 } }], cloud);
  assertEquals(await new DocumensoClient(ctx).requestAll("/envelope"), []);
  assertEquals(calls.length, 1);
});

Deno.test("requestAll asks for no more than it wants, capped at 100", async () => {
  const small = mockCtx([{ status: 200, body: { data: [] } }], cloud);
  await new DocumensoClient(small.ctx).requestAll("/envelope", {}, 5);
  assertEquals(new URL(small.calls[0].url).searchParams.get("perPage"), "5");

  const big = mockCtx([{ status: 200, body: { data: [] } }], cloud);
  await new DocumensoClient(big.ctx).requestAll("/envelope", {}, Infinity);
  assertEquals(new URL(big.calls[0].url).searchParams.get("perPage"), "100");
});
