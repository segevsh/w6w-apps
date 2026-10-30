import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import {
  compact,
  formatThinkificError,
  formatValidationErrors,
  queryFilters,
  ThinkificClient,
  truncate,
} from "../../lib/client.ts";
import {
  assertRejectsWith,
  errorBody,
  listEnvelope,
  mockCtx,
  pathOf,
  queryOf,
  validationErrorBody,
} from "../_helpers.ts";

test("compact: drops undefined/null/empty but keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

test("queryFilters: namespaces every key as query[key]", () => {
  assertEquals(queryFilters({ email: "a@b.com", page: undefined }), {
    "query[email]": "a@b.com",
  });
});

test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assert(out.startsWith("x".repeat(600)));
  assert(out.includes("700 bytes truncated"));
});

test("formatValidationErrors: handles all three documented shapes", () => {
  assertEquals(
    formatValidationErrors({ email: ["has already been taken"], password: ["is too short"] }),
    "email: has already been taken; password: is too short",
  );
  assertEquals(
    formatValidationErrors(["Course could not be found.", "User could not be found."]),
    "Course could not be found.; User could not be found.",
  );
  assertEquals(
    formatValidationErrors([{ field_name: "email" }]),
    "email",
  );
});

test("formatThinkificError: 401 explains the plan-gating ambiguity", () => {
  const msg = formatThinkificError(
    401,
    "GET",
    "/courses",
    JSON.stringify(errorBody("Authentication Error")),
  );
  assert(msg.includes("Authentication Error"));
  assert(/plan does not include API access/.test(msg));
});

test("formatThinkificError: 404 surfaces the vendor's own message", () => {
  const msg = formatThinkificError(
    404,
    "GET",
    "/courses/999",
    JSON.stringify(errorBody("Record not found.")),
  );
  assertEquals(msg, "Thinkific 404 for GET /courses/999: Record not found.");
});

test("formatThinkificError: 422 flattens the errors object", () => {
  const msg = formatThinkificError(
    422,
    "POST",
    "/users",
    JSON.stringify(validationErrorBody({ email: ["has already been taken"] })),
  );
  assert(msg.includes("email: has already been taken"));
});

test("formatThinkificError: 429 reports the rate limit without a remaining count", () => {
  const resetAt = Date.now() + 5000;
  const msg = formatThinkificError(429, "GET", "/courses", "", String(resetAt));
  assert(msg.includes("120 requests/minute"));
  assert(/resets in \d+s/.test(msg));
});

test("formatThinkificError: non-JSON body falls back to the raw text", () => {
  const msg = formatThinkificError(500, "GET", "/courses", "<html>Internal Server Error</html>");
  assert(msg.includes("<html>Internal Server Error</html>"));
});

test("ThinkificClient.list: unwraps the items/meta envelope and builds the URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: 1 }]) }]);
  const page = await new ThinkificClient(ctx).list("/courses", { query: { page: 1, limit: 25 } });
  assertEquals(page.items, [{ id: 1 }]);
  assertEquals(page.meta?.pagination?.total_items, 1);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/courses");
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "25" });
});

test("ThinkificClient.json: returns a single-resource body as-is", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: 1, name: "My Course" } }]);
  const course = await new ThinkificClient(ctx).json("/courses/1");
  assertEquals(course, { id: 1, name: "My Course" });
});

test("ThinkificClient.status: returns 204 with no body for update/delete", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const status = await new ThinkificClient(ctx).status("/users/1", { method: "DELETE" });
  assertEquals(status, 204);
  assertEquals(calls[0].method, "DELETE");
});

test("ThinkificClient: a non-ok response throws a formatted error, not a raw fetch error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Authentication Error") }]);
  await assertRejectsWith(() => new ThinkificClient(ctx).json("/courses"), "Authentication Error");
});

test("ThinkificClient: sends a JSON body with content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await new ThinkificClient(ctx).json("/enrollments", {
    method: "POST",
    body: { course_id: 1, user_id: 2 },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { course_id: 1, user_id: 2 });
});
