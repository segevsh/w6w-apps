import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  encodeForm,
  formatGumroadError,
  GumroadClient,
  seg,
  toList,
} from "../lib/client.ts";
import { mockCtx, queryOf } from "./_helpers.ts";

Deno.test("client: seg percent-encodes ids that end in == and neutralises slashes", () => {
  assertEquals(seg("A-m3CDDC5dlrSdKZp0RFhA=="), "A-m3CDDC5dlrSdKZp0RFhA%3D%3D");
  assertEquals(seg("a/../b"), "a%2F..%2Fb");
  assertEquals(seg(undefined), "");
});

Deno.test("client: compact keeps false and 0, drops empty values", () => {
  assertEquals(compact({ a: false, b: 0, c: "", d: null, e: undefined, f: "x" }), {
    a: false,
    b: 0,
    f: "x",
  });
});

Deno.test("client: toList splits, trims and drops empties", () => {
  assertEquals(toList("a, b,, c"), ["a", "b", "c"]);
  assertEquals(toList(["x", " y "]), ["x", "y"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("client: encodeForm uses key[] for arrays and string booleans", () => {
  const form = encodeForm({ name: "n", tags: ["a", "b"], universal: false, skip: undefined });
  assertEquals([...new URLSearchParams(form)], [
    ["name", "n"],
    ["tags[]", "a"],
    ["tags[]", "b"],
    ["universal", "false"],
  ]);
});

Deno.test("client: GET sends accept, no body and no content-type; query drops blanks", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new GumroadClient(ctx).call("GET", "/sales", {
    query: { email: "a@b.co", name: "", p: 0 },
  });
  assertEquals(calls[0].url.startsWith("https://api.gumroad.com/v2/sales?"), true);
  assertEquals(queryOf(calls[0].url), { email: "a@b.co", p: "0" });
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
});

Deno.test("client: never puts a credential in the URL or headers (sign owns it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await new GumroadClient(ctx).call("PUT", "/x", { form: { a: "1" } });
  assertEquals(calls[0].url.includes("access_token"), false);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: an HTTP error carries the vendor message and a 401 hint", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { success: false, message: "Nope" } }]);
  const err = await assertRejects(() => new GumroadClient(ctx).call("GET", "/user"), Error);
  assertEquals(err.message.includes("Nope"), true);
  assertEquals(err.message.includes("scope"), true);
});

Deno.test("client: a non-JSON error body is passed through, truncated", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "x".repeat(900) }]);
  const err = await assertRejects(() => new GumroadClient(ctx).call("GET", "/user"), Error);
  assertEquals(err.message.includes("502"), true);
  assertEquals(err.message.includes("truncated"), true);
});

Deno.test("client: a 2xx with a non-JSON body fails loudly", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  await assertRejects(() => new GumroadClient(ctx).call("GET", "/user"), Error, "expected JSON");
});

Deno.test("client: formatGumroadError without a message falls back to the raw body", () => {
  assertEquals(formatGumroadError(500, "GET", "/v2/x", "{}"), "Gumroad 500 for GET /v2/x: {}");
});
