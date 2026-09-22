import { assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_HOSTS,
  asOptionalJson,
  compact,
  conflictingResourceIdOf,
  encodeId,
  envelope,
  environmentOf,
  errorCodeOf,
  formatGoCardlessError,
  GOCARDLESS_VERSION,
  GoCardlessApiError,
  GoCardlessClient,
  hostForEnvironment,
  parseGoCardlessError,
  resolveIdempotencyKey,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, mockCtxWithInvocation, pathOf, queryOf } from "../_helpers.ts";

Deno.test("hosts: both environments, with live as the default origin", () => {
  assertEquals(API_HOSTS.live, "api.gocardless.com");
  assertEquals(API_HOSTS.sandbox, "api-sandbox.gocardless.com");
  assertEquals(API_BASE, "https://api.gocardless.com");
  assertEquals(GOCARDLESS_VERSION, "2015-07-06");
  assertEquals(hostForEnvironment("sandbox"), "api-sandbox.gocardless.com");
  assertEquals(hostForEnvironment("live"), "api.gocardless.com");
  // Anything unexpected must not become `https://undefined`.
  assertEquals(hostForEnvironment(undefined), "api.gocardless.com");
  assertEquals(hostForEnvironment("production"), "api.gocardless.com");
  assertEquals(environmentOf("sandbox"), "sandbox");
  assertEquals(environmentOf("nonsense"), "live");
});

Deno.test("compact: unset keys go, false and 0 stay", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("envelope: the body is wrapped in the resource's plural name", () => {
  assertEquals(envelope("customers", { email: "a@b.co" }), { customers: { email: "a@b.co" } });
  // The empty action envelope used by the cancel endpoints.
  assertEquals(envelope("payments"), { payments: {} });
});

Deno.test("encodeId: legal ids survive, path metacharacters do not", () => {
  assertEquals(encodeId("MD0000"), "MD0000");
  assertEquals(encodeId("  PM1 "), "PM1");
  assertEquals(encodeId("PM1/../creditors"), "PM1%2F..%2Fcreditors");
});

Deno.test("truncate: says how much it dropped", () => {
  assertEquals(truncate("short", 100), "short");
  const long = truncate("x".repeat(50), 10);
  assertEquals(long.startsWith("x".repeat(10)), true);
  assertEquals(long.includes("50 bytes truncated"), true);
});

Deno.test("asOptionalJson: parsed values pass through, JSON text is parsed, junk throws", () => {
  assertEquals(asOptionalJson({ a: 1 }, "Metadata"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "Metadata"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "Metadata"), undefined);
  assertEquals(asOptionalJson("", "Metadata"), undefined);
  try {
    asOptionalJson("{", "Metadata");
    throw new Error("should have thrown");
  } catch (err) {
    assertEquals((err as Error).message, "Metadata is not valid JSON");
  }
});

// --- the error envelope ------------------------------------------------------

Deno.test("parseGoCardlessError: the documented envelope, and nothing else", () => {
  const parsed = parseGoCardlessError(JSON.stringify(errorBody("invalid_api_usage", {
    code: 401,
    errors: [{ reason: "unauthorized" }],
  })));
  assertEquals(parsed?.type, "invalid_api_usage");
  assertEquals(parsed?.code, 401);

  assertEquals(parseGoCardlessError("<html>gateway</html>"), undefined);
  assertEquals(parseGoCardlessError(""), undefined);
  assertEquals(parseGoCardlessError('{"result":"ok"}'), undefined);
});

Deno.test("errorCodeOf: `reason` for most types, `field` for validation_failed", () => {
  const reason = parseGoCardlessError(JSON.stringify(errorBody("invalid_state", {
    errors: [{ reason: "mandate_not_active" }],
  })));
  assertEquals(errorCodeOf(reason), "mandate_not_active");

  const field = parseGoCardlessError(JSON.stringify(errorBody("validation_failed", {
    errors: [{ field: "currency", message: "is not included in the list" }],
  })));
  assertEquals(errorCodeOf(field), "currency");
  assertEquals(errorCodeOf(undefined), undefined);
});

Deno.test("formatGoCardlessError: one line, in the documented shape", () => {
  const line = formatGoCardlessError(
    422,
    "POST",
    "/payments",
    JSON.stringify(errorBody("validation_failed", {
      code: 422,
      message: "Validation failed",
      errors: [{ field: "amount", message: "must be greater than 0" }],
    })),
  );
  assertEquals(
    line,
    "GoCardless 422 validation_failed/amount for POST /payments: Validation failed: " +
      "must be greater than 0",
  );
});

Deno.test("formatGoCardlessError: the vendor's code wins over the status line", () => {
  const line = formatGoCardlessError(
    400,
    "GET",
    "/customers",
    JSON.stringify(errorBody("gocardless", { code: 403, message: "Forbidden" })),
  );
  assertEquals(line.startsWith("GoCardless 403 gocardless for GET /customers"), true, line);
});

Deno.test("formatGoCardlessError: an idempotency conflict names the existing resource", () => {
  const line = formatGoCardlessError(
    409,
    "POST",
    "/payments",
    JSON.stringify(errorBody("invalid_state", {
      code: 409,
      message: "A resource already exists with this idempotency key",
      errors: [{
        reason: "idempotent_creation_conflict",
        message: "The idempotency key has already been used",
        links: { conflicting_resource_id: "PM0000ABC" },
      }],
    })),
  );
  assertEquals(line.includes("409 invalid_state/idempotent_creation_conflict"), true, line);
  assertEquals(line.includes("PM0000ABC"), true, line);
});

Deno.test("conflictingResourceIdOf: only for the conflict reason, only when linked", () => {
  const conflict = parseGoCardlessError(JSON.stringify(errorBody("invalid_state", {
    errors: [{ reason: "idempotent_creation_conflict", links: { conflicting_resource_id: "PM1" } }],
  })));
  assertEquals(conflictingResourceIdOf(conflict), "PM1");

  const other = parseGoCardlessError(JSON.stringify(errorBody("invalid_state", {
    errors: [{ reason: "mandate_not_active", links: { conflicting_resource_id: "PM1" } }],
  })));
  assertEquals(conflictingResourceIdOf(other), undefined);
});

Deno.test("formatGoCardlessError: a body that is not JSON falls back to the raw text", () => {
  const line = formatGoCardlessError(500, "GET", "/creditors", "<html>oops</html>");
  assertEquals(line, "GoCardless 500 for GET /creditors: <html>oops</html>");
});

Deno.test("formatGoCardlessError: an empty body is admitted rather than rendered blank", () => {
  assertEquals(
    formatGoCardlessError(502, "GET", "/creditors", ""),
    "GoCardless 502 for GET /creditors (empty response body)",
  );
});

// --- the client's wire format ------------------------------------------------

Deno.test("client: a GET sends accept and nothing that looks like a credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: [] } }]);
  await new GoCardlessClient(ctx).json("/customers?limit=1");

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/customers");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers, { accept: "application/json" });
});

Deno.test("client: a body brings content-type, and blank query values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { customers: {} } }]);
  await new GoCardlessClient(ctx).json("/customers", {
    method: "POST",
    body: { customers: {} },
    query: { empty: "", missing: undefined, zero: 0 },
  });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(queryOf(calls[0].url), { zero: "0" });
});

Deno.test("client: an Idempotency-Key is only sent when there is one", async () => {
  const first = mockCtx([{ body: { customers: {} } }]);
  await new GoCardlessClient(first.ctx).create("customers", "/customers", {}, "key-1");
  assertEquals(first.calls[0].headers["idempotency-key"], "key-1");

  const second = mockCtx([{ body: { customers: {} } }]);
  await new GoCardlessClient(second.ctx).create("customers", "/customers", {});
  assertEquals("idempotency-key" in second.calls[0].headers, false);
});

/** `ctx.invocation.invocationId` is the fallback, exactly as the README says. */
Deno.test("resolveIdempotencyKey: the typed key wins, the invocation id is the fallback", () => {
  const { ctx } = mockCtxWithInvocation([], "inv-1");
  assertEquals(resolveIdempotencyKey("typed", ctx), "typed");
  assertEquals(resolveIdempotencyKey("   ", ctx), "inv-1");
  assertEquals(resolveIdempotencyKey(undefined, ctx), "inv-1");
  // No invocation (an editor run, say) and no key means no header at all.
  assertEquals(resolveIdempotencyKey("", mockCtx().ctx), undefined);
});

Deno.test("client: a list read reports null cursors when meta is absent", async () => {
  const { ctx } = mockCtx([{ body: { customers: [{ id: "CU1" }] } }]);
  const page = await new GoCardlessClient(ctx).list("customers", "/customers");
  assertEquals(page.items, [{ id: "CU1" }]);
  assertEquals(page.afterCursor, null);
  assertEquals(page.limit, undefined);
});

Deno.test("client: a failure throws a typed error carrying the vendor's own code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid_state", {
      code: 422,
      message: "Mandate is not active",
      errors: [{ reason: "mandate_not_active", message: "The mandate is cancelled" }],
    }),
  }]);
  const err = await assertRejects(
    () => new GoCardlessClient(ctx).json("/payments", { method: "POST" }),
    GoCardlessApiError,
  );
  assertEquals(err.status, 422);
  assertEquals(err.type, "invalid_state");
  assertEquals(err.reason, "mandate_not_active");
  assertEquals(err.method, "POST");
  assertEquals(err.path, "/payments");
  assertEquals(err.message.includes("invalid_state/mandate_not_active"), true, err.message);
});

Deno.test("client: a success body that is not JSON is refused rather than guessed", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: { "content-type": "text/html" },
    body: "<html>",
  }]);
  await assertRejects(
    () => new GoCardlessClient(ctx).json("/creditors"),
    Error,
    "GoCardless returned a body that is not JSON for GET /creditors",
  );
});
