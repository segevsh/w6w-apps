import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  encodeId,
  formatParseurError,
  ParseurClient,
  toList,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toList: splits a comma-separated string and passes an array through", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes an object through, rejects garbage", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
  assertThrows(() => asOptionalJson("not json", "Extra fields"), Error, "Extra fields");
});

Deno.test("encodeId: path-escapes a caller-supplied id", () => {
  assertEquals(encodeId("42"), "42");
  assertEquals(encodeId("a/b"), "a%2Fb");
});

Deno.test("formatParseurError: reads non_field_errors as the headline", () => {
  const msg = formatParseurError(
    403,
    "GET",
    "/parser",
    JSON.stringify({ non_field_errors: "Authentication failed" }),
  );
  assert(msg.includes("Authentication failed"));
  assert(msg.includes("403"));
});

Deno.test("formatParseurError: appends per-field DRF validation errors", () => {
  const msg = formatParseurError(
    400,
    "POST",
    "/parser",
    JSON.stringify({ name: ["This field may not be blank."] }),
  );
  assert(msg.includes("name: This field may not be blank."));
});

Deno.test("formatParseurError: adds the rate-limit hint only on 429", () => {
  const msg = formatParseurError(429, "GET", "/parser", JSON.stringify({}));
  assert(/5\/second per IP/.test(msg), msg);
  const other = formatParseurError(400, "GET", "/parser", JSON.stringify({}));
  assert(!/5\/second per IP/.test(other), other);
});

Deno.test("formatParseurError: falls back to the raw body when it is not JSON", () => {
  const msg = formatParseurError(502, "GET", "/parser", "<html>bad gateway</html>");
  assert(msg.includes("<html>bad gateway</html>"));
});

Deno.test("ParseurClient.request: throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { non_field_errors: "Authentication failed" } },
  ]);
  const err = await assertRejects(
    () => new ParseurClient(ctx).request("/parser"),
    Error,
  );
  assert(err.message.includes("Authentication failed"));
});

Deno.test("ParseurClient.request: an empty or unparsable success body returns undefined", async () => {
  const { ctx: ctx1 } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new ParseurClient(ctx1).request("/document/1"), undefined);

  const { ctx: ctx2 } = mockCtx([
    { status: 200, body: "", headers: { "content-type": "text/html" } },
  ]);
  assertEquals(await new ParseurClient(ctx2).request("/webhook/1"), undefined);
});

Deno.test("ParseurClient.request: query params are set, and array values repeat the key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ParseurClient(ctx).request("/parser", {
    query: { page: 2, tags: ["a", "b"], empty: undefined },
  });

  assertEquals(queryOf(calls[0].url).page, "2");
  assertEquals(new URL(calls[0].url).searchParams.getAll("tags"), ["a", "b"]);
  assertEquals(new URL(calls[0].url).searchParams.has("empty"), false);
});

Deno.test("ParseurClient.request: a JSON body sets content-type and is stringified", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await new ParseurClient(ctx).request("/parser", { method: "POST", body: { name: "x" } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "x" });
});

Deno.test("ParseurClient.status: returns the HTTP status without parsing a body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const status = await new ParseurClient(ctx).status("/document/1", { method: "DELETE" });

  assertEquals(status, 204);
  assertEquals(pathOf(calls[0].url), "/document/1");
});

Deno.test("ParseurClient.status: throws on a non-2xx response, same as request", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { non_field_errors: "not found" } }]);
  await assertRejects(() => new ParseurClient(ctx).status("/document/1"), Error, "not found");
});
