import { assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  compact,
  FloatClient,
  formatFloatError,
  intBool,
  toCsv,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, paginationHeaders, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact - drops undefined, null and empty string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("intBool - maps boolean to Float's 1/0 integer convention", () => {
  assertEquals(intBool(true), 1);
  assertEquals(intBool(false), 0);
  assertEquals(intBool(undefined), undefined);
});

Deno.test("toCsv - joins an array and passes through a string", () => {
  assertEquals(toCsv(["a", "b"]), "a,b");
  assertEquals(toCsv("a,b"), "a,b");
  assertEquals(toCsv(undefined), undefined);
  assertEquals(toCsv([]), undefined);
});

Deno.test("asOptionalJson - parses a JSON string and passes through an object", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
});

Deno.test("asOptionalJson - throws a labeled error on invalid JSON", () => {
  let threw = false;
  try {
    asOptionalJson("{not json", "Additional fields");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "Additional fields is not valid JSON");
  }
  assertEquals(threw, true);
});

Deno.test("truncate - leaves a short string alone", () => {
  assertEquals(truncate("short"), "short");
});

Deno.test("truncate - shortens and annotates a long string", () => {
  const long = "x".repeat(700);
  const out = truncate(long);
  assertEquals(out.startsWith("x".repeat(600)), true);
  assertEquals(out.includes("700 bytes truncated"), true);
});

Deno.test("formatFloatError - real JSON error carries name and message", () => {
  const msg = formatFloatError(
    401,
    "GET",
    "/v3/people",
    "application/json; charset=UTF-8",
    JSON.stringify({
      name: "Unauthorized",
      message: "Your request was made with invalid credentials.",
      code: 0,
      status: 401,
    }),
  );
  assertEquals(msg.includes("Unauthorized"), true);
  assertEquals(msg.includes("invalid credentials"), true);
});

Deno.test("formatFloatError - non-JSON 403 is reported as the edge/WAF refusal, not a credential verdict", () => {
  const msg = formatFloatError(
    403,
    "GET",
    "/v3/people",
    "text/html; charset=UTF-8",
    "403 Forbidden",
  );
  assertEquals(msg.includes("no JSON body"), true);
  assertEquals(msg.includes("Reconnect"), true);
});

Deno.test("formatFloatError - 429 appends the rate-limit hint", () => {
  const msg = formatFloatError(
    429,
    "GET",
    "/v3/people",
    "application/json",
    JSON.stringify({ name: "TooManyRequests", message: "rate limited", status: 429 }),
  );
  assertEquals(msg.includes("rate-limits per company"), true);
});

Deno.test("FloatClient.list - GET carries query params and reads X-Pagination-* headers", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: [{ people_id: 1 }],
      headers: paginationHeaders({ "x-pagination-total-count": "42" }),
    },
  ]);
  const { items, pagination } = await new FloatClient(ctx).list("/people", {
    "per-page": 1,
    active: 1,
  });
  assertEquals(items, [{ people_id: 1 }]);
  assertEquals(pagination.totalCount, 42);
  assertEquals(pathOf(calls[0].url), "/v3/people");
  assertEquals(queryOf(calls[0].url), { "per-page": "1", active: "1" });
  assertEquals(calls[0].headers["user-agent"].includes("w6w"), true);
});

Deno.test("FloatClient.list - a 204 response is an empty page, not an error", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: paginationHeaders() }]);
  const { items } = await new FloatClient(ctx).list("/status", {});
  assertEquals(items, []);
});

Deno.test("FloatClient.json - POST sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { client_id: 1, name: "Acme" } }]);
  const out = await new FloatClient(ctx).json("/clients", {
    method: "POST",
    body: { name: "Acme" },
  });
  assertEquals(out, { client_id: 1, name: "Acme" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Acme" });
});

Deno.test("FloatClient.remove - DELETE against a 204 resolves with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await new FloatClient(ctx).remove("/clients/1");
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("FloatClient - a JSON error body throws with the vendor's name and message", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: { "content-type": "application/json" },
      body: errorBody("Unauthorized", "Your request was made with invalid credentials.", 401),
    },
  ]);
  await assertRejects(
    () => new FloatClient(ctx).json("/people/1"),
    Error,
    "invalid credentials",
  );
});

Deno.test("FloatClient - a non-JSON 403 (the edge/WAF refusal) does not throw a JSON parse error", async () => {
  const { ctx } = mockCtx([
    { status: 403, headers: { "content-type": "text/html; charset=UTF-8" }, body: "403 Forbidden" },
  ]);
  await assertRejects(
    () => new FloatClient(ctx).json("/people/1"),
    Error,
    "no JSON body",
  );
});
