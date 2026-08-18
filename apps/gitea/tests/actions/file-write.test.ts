import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { decodeBase64 } from "../../lib/client.ts";
import action from "../../actions/file-write.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };
const url = "https://git.example.com/api/v1/repos/acme/web/contents/src/index.ts";

/** The sha guards against clobbering a change that landed in between. */
Deno.test("file-write: reads the existing file and PUTs with its sha", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { sha: "abc123", content: "b2xk" } },
    { status: 200, body: { content: { sha: "def456" } } },
  ], conn);
  const result = await action.execute!({
    repo: "web",
    path: "src/index.ts",
    content: "new",
    message: "Update",
  }, ctx) as { created: boolean };
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[1].method, "PUT");
  assertEquals(calls[1].url, url);
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.sha, "abc123");
  assertEquals(decodeBase64(body.content), "new");
  assertEquals(result.created, false);
});

/** A file that does not exist yet is a 404 on the read, and means create. */
Deno.test("file-write: falls back to POST when the file is not there", async () => {
  const { ctx, calls } = mockCtx([
    { status: 404, body: { message: "object does not exist" } },
    { status: 201, body: { content: { sha: "new" } } },
  ], conn);
  const result = await action.execute!({
    repo: "web",
    path: "src/index.ts",
    content: "hello",
  }, ctx) as { created: boolean };
  assertEquals(calls[1].method, "POST");
  assertEquals(JSON.parse(calls[1].body!).sha, undefined);
  assertEquals(result.created, true);
});

/** btoa alone throws above U+00FF — the encoder has to handle UTF-8. */
Deno.test("file-write: encodes non-ASCII content rather than throwing", async () => {
  const { ctx, calls } = mockCtx([
    { status: 404, body: {} },
    { status: 201, body: {} },
  ], conn);
  await action.execute!({ repo: "web", path: "a.txt", content: "こんにちは — 🎉" }, ctx);
  assertEquals(decodeBase64(JSON.parse(calls[1].body!).content), "こんにちは — 🎉");
});

Deno.test("file-write: a new branch is sent so a change can be proposed", async () => {
  const { ctx, calls } = mockCtx([
    { status: 404, body: {} },
    { status: 201, body: {} },
  ], conn);
  await action.execute!({
    repo: "web",
    path: "a.txt",
    content: "x",
    branch: "main",
    newBranch: "bot/update",
  }, ctx);
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.branch, "main");
  assertEquals(body.new_branch, "bot/update");
});

/** Any failure other than "not found" is real and must not become a create. */
Deno.test("file-write: a non-404 read failure is raised, not retried as a create", async () => {
  const { ctx, calls } = mockCtx([{ status: 403, body: { message: "forbidden" } }], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", path: "a.txt", content: "x" }, ctx),
    Error,
    "403",
  );
  assertEquals(calls.length, 1);
});

Deno.test("file-write: path and content are both required, before any request", async () => {
  const noPath = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", content: "x" }, noPath.ctx),
    Error,
    "`path`",
  );
  const noContent = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", path: "a.txt" }, noContent.ctx),
    Error,
    "`content`",
  );
  assertEquals(noPath.calls.length + noContent.calls.length, 0);
});

/** force_push discards history rather than adding to it. */
Deno.test("file-write: force push is not offered at all", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.some((k) => /force/i.test(k)), "force_push must not be reachable");
});
