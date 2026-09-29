import { assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  formatPaperformError,
  PaperformClient,
  truncate,
} from "../../lib/client.ts";
import { envelope, errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: results() unwraps the results envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: envelope({ form: { id: "f1" } }) }]);
  const out = await new PaperformClient(ctx).results<{ form?: { id?: string } }>("/forms/f1");
  assertEquals(out?.form?.id, "f1");
});

Deno.test("client: page() keeps the pagination siblings alongside results", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: listEnvelope({ forms: [{ id: "f1" }] }, { total: 5, has_more: true, limit: 20, skip: 0 }),
  }]);
  const out = await new PaperformClient(ctx).page<{ forms?: unknown[] }>("/forms");
  assertEquals(out.total, 5);
  assertEquals(out.has_more, true);
  assertEquals((out.results?.forms as unknown[]).length, 1);
});

Deno.test("client: deleted() reads status === 'ok'", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const out = await new PaperformClient(ctx).deleted("/forms/f1/submissions/s1", {
    method: "DELETE",
  });
  assertEquals(out, true);
});

Deno.test("client: array query params serialize as repeated keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ forms: [] }) }]);
  await new PaperformClient(ctx).page("/forms", { query: { search_fields: ["title", "slug"] } });
  assertEquals(queryOf(calls[0].url), { search_fields: ["title", "slug"] });
});

Deno.test("client: sends the accept header and no body on a GET", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ form: {} }) }]);
  await new PaperformClient(ctx).results("/forms/f1");
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("client: a PUT sends a JSON content-type and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope({ form: {} }) }]);
  await new PaperformClient(ctx).results("/forms/f1", { method: "PUT", body: { title: "New" } });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ title: "New" }));
});

Deno.test("client: throws a formatted error on a non-2xx JSON response", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("Form not found", "not_found"),
  }]);
  await assertRejects(
    () => new PaperformClient(ctx).results("/forms/nope"),
    Error,
    "not_found",
  );
});

Deno.test("formatPaperformError: reads status/error_type/message/details", () => {
  const raw = JSON.stringify(errorBody("Invalid request", "validation", ["title is required"]));
  const msg = formatPaperformError(400, "PUT", "/v1/forms/f1", raw, "application/json");
  assertEquals(msg.includes("400"), true);
  assertEquals(msg.includes("validation"), true);
  assertEquals(msg.includes("Invalid request"), true);
  assertEquals(msg.includes("title is required"), true);
});

Deno.test("formatPaperformError: a 429 is reported without trying to parse its HTML body", () => {
  const html = "<!DOCTYPE html><html><body>429 Too Many Requests</body></html>";
  const msg = formatPaperformError(429, "GET", "/v1/forms", html, "text/html; charset=utf-8");
  assertEquals(msg.includes("429"), true);
  assertEquals(msg.includes("rate limited"), true);
  assertEquals(msg.includes("<html>"), false);
});

Deno.test("formatPaperformError: falls back to the raw body when it is not JSON and not a 429", () => {
  const msg = formatPaperformError(500, "GET", "/v1/forms", "internal error", "text/plain");
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("internal error"), true);
});

Deno.test("truncate: leaves short text untouched and truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long, 800);
  assertEquals(out.startsWith("x".repeat(800)), true);
  assertEquals(out.includes("900 bytes truncated"), true);
});

Deno.test("asOptionalJson: parses a JSON string, passes through an object, and passes through absence", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws a labelled error on invalid JSON", () => {
  let threw = false;
  try {
    asOptionalJson("{not json", "Type-specific options");
  } catch (err) {
    threw = true;
    assertEquals((err as Error).message.includes("Type-specific options"), true);
  }
  assertEquals(threw, true);
});
