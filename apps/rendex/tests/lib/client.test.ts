import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeId,
  formatRendexError,
  RendexClient,
  unwrap,
} from "../../lib/client.ts";
import { captureBody } from "../../lib/capture.ts";
import { envelope, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("compact: drops unset, blank and empty-array values but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: [], e: false, f: 0, g: "x" }), {
    e: false,
    f: 0,
    g: "x",
  });
});

Deno.test("asOptionalJson: parses strings, passes values, rejects junk", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson("", "x"), undefined);
  try {
    asOptionalJson("{nope", "Cookies");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "Cookies is not valid JSON");
  }
});

Deno.test("encodeId: escapes path characters", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
});

Deno.test("unwrap: spreads object data with meta, wraps arrays, passes bare bodies", () => {
  assertEquals(unwrap(envelope({ a: 1 })), { a: 1, meta: { requestId: "req_1" } });
  assertEquals(unwrap(envelope([1, 2])), { items: [1, 2], meta: { requestId: "req_1" } });
  assertEquals(unwrap({ plain: true }), { plain: true });
});

Deno.test("formatRendexError: keeps the vendor code, message, details and request id", () => {
  const msg = formatRendexError(
    400,
    "POST",
    "/v1/screenshot/json",
    JSON.stringify(errorBody("VALIDATION_ERROR", "Invalid", [{ path: "url", message: "bad" }])),
  );
  assert(msg.includes("400 VALIDATION_ERROR"), msg);
  assert(msg.includes("url: bad"), msg);
  assert(msg.includes("request req_err"), msg);
  assert(formatRendexError(500, "GET", "/x", "<html>").includes("<html>"));
  assert(
    formatRendexError(429, "GET", "/x", JSON.stringify(errorBody("RATE_LIMITED", "slow")), "12")
      .includes("retry after 12s"),
  );
  assert(
    formatRendexError(429, "GET", "/x", JSON.stringify(errorBody("USAGE_EXCEEDED", "cap")))
      .includes("monthly credit limit"),
  );
});

Deno.test("RendexClient: builds URL and JSON body, never sets credentials", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ ok: 1 }) }]);
  const out = await new RendexClient(ctx).json("/watches", {
    method: "POST",
    query: { status: "active", skip: undefined },
    body: { url: "https://example.com" },
  });
  assertEquals(calls[0].url, "https://api.rendex.dev/v1/watches?status=active");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { ok: 1, meta: { requestId: "req_1" } });
});

Deno.test("RendexClient: an error status throws the formatted vendor error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("INVALID_KEY", "Invalid API key.") }]);
  await assertRejects(
    async () => await new RendexClient(ctx).json("/account"),
    Error,
    "401 INVALID_KEY",
  );
});

Deno.test("RendexClient: an empty body yields an empty object", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new RendexClient(ctx).json("/watches/x", { method: "DELETE" }), {});
});

Deno.test("captureBody: parses JSON params and drops unset fields", () => {
  assertEquals(
    captureBody({
      format: "pdf",
      fullPage: false,
      hideSelectors: '["#a"]',
      cookies: [{ name: "n", value: "v" }],
      pdfMargin: '{"top":"1in"}',
      width: undefined,
    }),
    {
      format: "pdf",
      fullPage: false,
      hideSelectors: ["#a"],
      cookies: [{ name: "n", value: "v" }],
      pdfMargin: { top: "1in" },
    },
  );
});
