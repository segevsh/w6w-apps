import { assert, assertEquals } from "@std/assert";
import {
  formatSemrushError,
  isSemrushErrorEnvelope,
  parseApiUnits,
  parseSemrushError,
  SemrushClient,
  truncate,
} from "../../lib/client.ts";
import { envelope, errorEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: recognises the documented error envelope and only that", () => {
  assert(isSemrushErrorEnvelope(errorEnvelope(401, "Unauthorized")));
  // `meta.success` must be exactly false, and a numeric code must be present.
  assertEquals(isSemrushErrorEnvelope({ meta: { success: true }, error: { code: 401 } }), false);
  assertEquals(isSemrushErrorEnvelope({ meta: { success: false }, error: {} }), false);
  assertEquals(isSemrushErrorEnvelope({ meta: { success: false }, error: { code: "401" } }), false);
  assertEquals(isSemrushErrorEnvelope(null), false);
  assertEquals(isSemrushErrorEnvelope("<html/>"), false);
});

Deno.test("client: parseSemrushError returns undefined for non-JSON bodies", () => {
  assertEquals(parseSemrushError("<html>maintenance</html>"), undefined);
  assertEquals(parseSemrushError(""), undefined);
  assertEquals(parseSemrushError(JSON.stringify(errorEnvelope(401)))?.error.code, 401);
});

Deno.test("client: a documented envelope becomes one readable line with its code", () => {
  const message = formatSemrushError(
    401,
    "GET",
    "/apis/v4/backlinks/v1/overview",
    JSON.stringify(errorEnvelope(401, "Unauthorized")),
  );
  assertEquals(message, "SEMrush 401 401 for GET /apis/v4/backlinks/v1/overview: Unauthorized");
});

Deno.test("client: a retryable envelope says so", () => {
  const message = formatSemrushError(
    429,
    "GET",
    "/apis/v4/backlinks/v1/links",
    JSON.stringify(errorEnvelope(429, "Too Many Requests", true)),
  );
  assert(message.includes("429"));
  assert(message.includes("retryable"));
});

Deno.test("client: a non-envelope body keeps the status and a bounded excerpt", () => {
  const message = formatSemrushError(502, "GET", "/apis/v4/keywords/v1/metrics", "<html/>");
  assertEquals(message, "SEMrush returned HTTP 502 for GET /apis/v4/keywords/v1/metrics: <html/>");
});

Deno.test("client: truncate bounds a long body", () => {
  const long = "x".repeat(2000);
  const cut = truncate(long);
  assert(cut.length < long.length);
  assert(cut.includes("bytes truncated"));
  assertEquals(truncate("short"), "short");
});

Deno.test("client: parseApiUnits strips thousands separators and rejects non-numbers", () => {
  assertEquals(parseApiUnits("1,000"), 1000);
  assertEquals(parseApiUnits(" 42\n"), 42);
  assertEquals(parseApiUnits("0"), 0);
  assertEquals(parseApiUnits(""), undefined);
  assertEquals(parseApiUnits("<html>"), undefined);
  assertEquals(parseApiUnits('{"units":5}'), undefined);
});

Deno.test("client: data() GETs the v4 path, joins arrays, and unwraps `data`", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ anchor: "a" }]) }]);

  const out = await new SemrushClient(ctx).data<Array<Record<string, string>>>(
    "/backlinks/v1/anchors",
    { query: { url: "example.com", fields: ["anchor", "domains_count"], direction: "DESC" } },
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/apis/v4/backlinks/v1/anchors");
  assertEquals(queryOf(calls[0].url), {
    url: "example.com",
    fields: "anchor,domains_count",
    direction: "DESC",
  });
  assertEquals(out[0].anchor, "a");
});
