import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { encodeBase64 } from "../../lib/client.ts";
import action from "../../actions/file-get.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("file-get: decodes the base64 content and keeps the raw form", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { path: "a.txt", sha: "abc", encoding: "base64", content: encodeBase64("hello") },
  }], conn);
  const result = await action.execute!({ repo: "web", path: "a.txt" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/contents/a.txt");
  assertEquals(result.decodedContent, "hello");
  assertEquals(result.content, encodeBase64("hello"));
  // The sha is what a later write needs.
  assertEquals(result.sha, "abc");
});

/** A directory answers an array — there is nothing to decode. */
Deno.test("file-get: a directory listing passes through untouched", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ path: "a.txt" }, { path: "b.txt" }] }], conn);
  assertEquals(await action.execute!({ repo: "web", path: "src" }, ctx), [
    { path: "a.txt" },
    { path: "b.txt" },
  ]);
});

Deno.test("file-get: each path segment is encoded separately, keeping the slashes", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ repo: "web", path: "/src/some dir/a b.ts" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/v1/repos/acme/web/contents/src/some%20dir/a%20b.ts",
  );
});

Deno.test("file-get: a ref reaches the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ repo: "web", path: "a.txt", ref: "develop" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("ref"), "develop");
});

Deno.test("file-get: a blank path fails before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ repo: "web" }, ctx), Error, "`path`");
  assertEquals(calls.length, 0);
});
