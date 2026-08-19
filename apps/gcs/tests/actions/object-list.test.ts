import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-list.ts";

const listing = {
  status: 200,
  body: {
    items: [
      { name: "logs/app.log", size: "1024" },
      { name: "logs/error.log", size: "2048" },
    ],
    prefixes: ["logs/2026/", "logs/2025/"],
    nextPageToken: "tok",
  },
};

Deno.test("object-list: lists a bucket's objects", async () => {
  const { ctx, calls } = mockCtx([listing]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/storage/v1/b/uploads/o");
  assertEquals(result.names, ["logs/app.log", "logs/error.log"]);
  assertEquals(result.nextPageToken, "tok");
});

/**
 * The mistake this action exists to prevent: reading only `items` from a
 * delimited listing shows an empty folder while everything is one level down.
 */
Deno.test("object-list: returns the synthetic subfolders separately, and counts them", async () => {
  const { ctx, calls, logs } = mockCtx([listing]);
  const result = await action.execute(
    { bucket: "uploads", prefix: "logs/", delimiter: "/" },
    ctx,
  ) as Record<string, unknown>;
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("prefix"), "logs/");
  assertEquals(url.searchParams.get("delimiter"), "/");
  assertEquals(result.prefixes, ["logs/2026/", "logs/2025/"]);
  assertEquals(result.prefixCount, 2);
  assertEquals(logs[0].data, { count: 2, prefixCount: 2 });
  assert(/SEPARATE `prefixes` array/.test(action.description!), action.description);
});

Deno.test("object-list: without a delimiter the listing is recursive and prefixes are empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [{ name: "a/b/c.txt" }] } }]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).searchParams.get("delimiter"), null);
  assertEquals(result.prefixes, []);
  assertEquals(result.prefixCount, 0);
});

/** Both are hidden by default, and both stop a bucket being deleted. */
Deno.test("object-list: versions and soft-deleted objects are opt-in", async () => {
  const { ctx, calls } = mockCtx([listing]);
  await action.execute({ bucket: "uploads", versions: true, softDeleted: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("versions"), "true");
  assertEquals(url.searchParams.get("softDeleted"), "true");

  const plain = mockCtx([listing]);
  await action.execute({ bucket: "uploads" }, plain.ctx);
  assertEquals(new URL(plain.calls[0].url).searchParams.get("versions"), null);
});

/** `size` is a string, because an object can exceed a safe integer. */
Deno.test("object-list: sums the sizes, converting from the API's strings", async () => {
  const { ctx } = mockCtx([listing]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.totalBytes, 3072);
});

Deno.test("object-list: a glob is filtered by Cloud Storage rather than the workflow", async () => {
  const { ctx, calls } = mockCtx([listing]);
  await action.execute({ bucket: "uploads", matchGlob: "**/*.log" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("matchGlob"), "**/*.log");
});

Deno.test("object-list: an empty bucket is not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute({ bucket: "uploads" }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 0);
  assertEquals(result.totalBytes, 0);
});
