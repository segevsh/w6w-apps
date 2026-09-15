import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  API_BASE,
  asJsonText,
  asOptionalJsonValue,
  base64ToBytes,
  compact,
  formatMindeeError,
  MindeeClient,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client: API_BASE has no path prefix", () => {
  assertEquals(API_BASE, "https://api-v2.mindee.net");
});

Deno.test("client: json() parses a successful JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { hello: "world" } }]);
  const result = await new MindeeClient(ctx).json("/v2/search/models");

  assertEquals(result, { hello: "world" });
  assertEquals(pathOf(calls[0].url), "/v2/search/models");
});

Deno.test("client: query params are set on the URL, blank values dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MindeeClient(ctx).json("/v2/search/models", {
    query: { name: "invoice", filename: undefined, page: 2, redirect: false },
  });

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("name"), "invoice");
  assertEquals(url.searchParams.has("filename"), false);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("redirect"), "false");
});

Deno.test("client: a FormData body is sent as-is, no content-type override", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: {} }]);
  const form = new FormData();
  form.append("model_id", "abc");
  await new MindeeClient(ctx).json("/v2/products/extraction/enqueue", { method: "POST", form });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].form, { model_id: ["abc"] });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: a JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MindeeClient(ctx).json("/v2/products/extraction/rag-documents/x", {
    method: "PATCH",
    json: { status: "Active" },
  });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ status: "Active" }));
});

Deno.test("client: a non-ok response throws a formatted error", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: errorBody(404, "404-001", "Not Found", "The requested resource does not exist."),
    },
  ]);

  await assertRejectsWith(
    () => new MindeeClient(ctx).json("/v2/jobs/missing"),
    /Mindee 404 404-001 Not Found for GET \/v2\/jobs\/missing/,
  );
});

async function assertRejectsWith(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
  } catch (e) {
    assert(pattern.test((e as Error).message), (e as Error).message);
    return;
  }
  throw new Error("expected fn() to reject");
}

Deno.test("formatMindeeError: falls back to the raw body when it isn't the error envelope", () => {
  const message = formatMindeeError(500, "GET", "/v2/jobs/x", "upstream exploded");
  assertEquals(message, "Mindee 500 for GET /v2/jobs/x: upstream exploded");
});

Deno.test("formatMindeeError: surfaces pointer-level validation detail", () => {
  const body = errorBody(
    422,
    "422-001",
    "Invalid fields in form",
    "One or more fields failed validation.",
    [
      { pointer: "/model_id", detail: "must be a valid UUID" },
    ],
  );
  const message = formatMindeeError(
    422,
    "POST",
    "/v2/products/extraction/enqueue",
    JSON.stringify(body),
  );

  assert(message.includes("422-001"));
  assert(message.includes("/model_id: must be a valid UUID"));
});

Deno.test("formatMindeeError: a 429 gets a backoff hint appended", () => {
  const body = errorBody(429, "429-001", "Too Many Requests", "Rate limit exceeded.");
  const message = formatMindeeError(
    429,
    "POST",
    "/v2/products/extraction/enqueue",
    JSON.stringify(body),
  );
  assert(/rate-limits/i.test(message));
});

Deno.test("truncate: leaves short text alone, trims long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(950);
  const out = truncate(long, 900);
  assertEquals(out.length, 900 + "… (950 bytes truncated)".length);
});

Deno.test("base64ToBytes: decodes plain base64", () => {
  const bytes = new Uint8Array(base64ToBytes(btoa("hello")));
  assertEquals(new TextDecoder().decode(bytes), "hello");
});

Deno.test("base64ToBytes: strips a data-URL prefix", () => {
  const bytes = new Uint8Array(base64ToBytes(`data:application/pdf;base64,${btoa("hi")}`));
  assertEquals(new TextDecoder().decode(bytes), "hi");
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("asOptionalJsonValue: passes an already-parsed value through", () => {
  assertEquals(asOptionalJsonValue({ a: 1 }, "x"), { a: 1 });
});

Deno.test("asOptionalJsonValue: parses a JSON string", () => {
  assertEquals(asOptionalJsonValue('{"a":1}', "x"), { a: 1 });
});

Deno.test("asOptionalJsonValue: undefined/empty stays undefined", () => {
  assertEquals(asOptionalJsonValue(undefined, "x"), undefined);
  assertEquals(asOptionalJsonValue("", "x"), undefined);
});

Deno.test("asOptionalJsonValue: throws on unparseable text, naming the field", () => {
  assertThrows(
    () => asOptionalJsonValue("{not json", "Annotation"),
    Error,
    "Annotation is not valid JSON",
  );
});

Deno.test("asJsonText: stringifies an object, passes a string through unchanged", () => {
  assertEquals(asJsonText({ a: 1 }, "x"), '{"a":1}');
  assertEquals(asJsonText('{"a":1}', "x"), '{"a":1}');
});

Deno.test("asJsonText: throws on unparseable text", () => {
  assertThrows(
    () => asJsonText("{not json", "Data schema"),
    Error,
    "Data schema is not valid JSON",
  );
});
