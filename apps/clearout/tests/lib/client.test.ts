import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  ClearoutClient,
  ClearoutError,
  compact,
  formatError,
  splitList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: unwraps data, builds the /v2 URL, drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { a: 1 } } }]);
  const res = await new ClearoutClient(ctx).request("/x", {
    query: { q: "v", e: "", n: undefined },
  });
  assertEquals(res.data, { a: 1 });
  assertEquals(calls[0].url, "https://api.clearout.io/v2/x?q=v");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: a JSON body is POSTed with a content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: {} } }]);
  await new ClearoutClient(ctx).request("/x", { body: { k: 1 } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { k: 1 });
});

Deno.test("client: status failed under HTTP 200 still throws, with code and message", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { status: "failed", error: { code: 1027, message: "Email address not found" } },
  }]);
  const err = await assertRejects(
    () => new ClearoutClient(ctx).request("/x"),
    ClearoutError,
    "Email address not found",
  );
  assert(err.message.includes("code 1027"));
});

Deno.test("client: 401 code 1000 and 402 get actionable hints; 400 lists the field reasons", () => {
  const e401 = formatError(401, "GET", "/v2/x", {
    error: { code: 1000, message: "Invalid API Token, please generate new token" },
  }, "");
  assert(e401.includes("generate a new one"));
  assert(
    formatError(402, "POST", "/v2/x", { error: { code: 1002, message: "no" } }, "").includes(
      "credits",
    ),
  );
  const e400 = formatError(400, "POST", "/v2/x", {
    error: { message: "Bad", reasons: [{ field: ["body", "email"], messages: ["required"] }] },
  }, "");
  assert(e400.includes("body.email: required"));
});

Deno.test("client: a non-JSON error body is surfaced truncated, not parsed", async () => {
  const { ctx } = mockCtx([{
    status: 503,
    headers: { "content-type": "text/html" },
    body: "<html>down</html>",
  }]);
  await assertRejects(() => new ClearoutClient(ctx).request("/x"), Error, "503");
});

Deno.test("client: a multipart form is POSTed without a hand-set content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { list_id: "l1" } } }]);
  const form = new FormData();
  form.append("file", new Blob(["a"]), "a.csv");
  await new ClearoutClient(ctx).request("/up", { form });
  assertEquals(calls[0].method, "POST");
  // fetch derives the multipart boundary header itself; the client must not set a JSON one.
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: compact and splitList", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals(splitList("a@x.com, b@x.com\n c@x.com;;"), ["a@x.com", "b@x.com", "c@x.com"]);
  assertEquals(splitList(["a", " ", "b"]), ["a", "b"]);
  assertEquals(splitList(undefined), []);
});
