import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  compact,
  errorText,
  formatError,
  pathId,
  requireText,
  toList,
  truncate,
  ZeplinClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: false, e: null, f: 0 }), {
    a: 1,
    d: false,
    f: 0,
  });
  assertEquals(toList(" a, b\n\nc "), ["a", "b", "c"]);
  assertEquals(toList(["x", " "]), ["x"]);
  assertEquals(requireText(" x ", "L"), "x");
  assertThrows(() => requireText("", "Label"), Error, "Label is required");
  assertEquals(pathId(" a/b ", "L"), "a%2Fb");
  assertEquals(truncate("abcdef", 3), "abc… (6 chars truncated)");
});

Deno.test("client: errorText reads message and detail, HTML titles and raw text", () => {
  assertEquals(
    errorText('{"message":"invalid_token","detail":"Authorization header is missing"}'),
    "invalid_token (Authorization header is missing)",
  );
  assertEquals(errorText("<html><title>Bad Gateway</title></html>"), "Bad Gateway");
  assertEquals(errorText(" plain "), "plain");
  assertEquals(errorText(""), "");
});

Deno.test("client: formatError adds a hint per status and the retry-after on 429", () => {
  assertEquals(formatError(401, "GET", "/x", "{}").includes("reconnect"), true);
  assertEquals(formatError(404, "GET", "/x", "{}").includes("not a member"), true);
  assertEquals(formatError(422, "PATCH", "/x", "{}").includes("archived"), true);
  assertEquals(formatError(429, "GET", "/x", "{}", "12").includes("retry after 12s"), true);
});

Deno.test("client: request omits empty query values and sends JSON bodies with a content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }]);
  await new ZeplinClient(ctx).request("POST", "/x", {
    query: { a: "1", b: "", c: undefined },
    body: { k: 1 },
  });
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/x?a=1");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a 204 is null, a non-JSON 200 and a 429 are errors", async () => {
  const empty = mockCtx([{ status: 204 }]);
  assertEquals(await new ZeplinClient(empty.ctx).request("DELETE", "/x"), null);
  const html = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html></html>" }]);
  await assertRejects(
    async () => await new ZeplinClient(html.ctx).get("/x"),
    Error,
    "expected JSON",
  );
  const busy = mockCtx([{
    status: 429,
    headers: { "retry-after": "7" },
    body: { message: "Rate limit exceeded" },
  }]);
  await assertRejects(
    async () => await new ZeplinClient(busy.ctx).get("/x"),
    Error,
    "retry after 7s",
  );
});

Deno.test("client: page computes next_offset only for a full page", async () => {
  const full = mockCtx([{ body: [1, 2, 3] }]);
  assertEquals(
    (await new ZeplinClient(full.ctx).page("/x", {}, { limit: 3, offset: 6 })).next_offset,
    9,
  );
  const short = mockCtx([{ body: [1] }]);
  assertEquals((await new ZeplinClient(short.ctx).page("/x", {}, { limit: 3 })).next_offset, null);
});
