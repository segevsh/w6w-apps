import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/documents-batch-get.ts";

const STREAM = [
  {
    found: {
      name: "projects/p1/databases/(default)/documents/users/alice",
      fields: { name: { stringValue: "Ada" } },
    },
    readTime: "2026-09-22T00:00:00Z",
  },
  { missing: "projects/p1/databases/(default)/documents/users/bob" },
  { readTime: "2026-09-22T00:00:01Z" },
];

Deno.test("documents-batch-get: POSTs full resource names, and separates found from missing", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: STREAM }], { display: DISPLAY });

  const result = await action.execute({ paths: ["users/alice", "users/bob"] }, ctx) as {
    documents: Array<{ data?: unknown }>;
    missing: string[];
    readTime?: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents:batchGet",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    documents: [
      "projects/p1/databases/(default)/documents/users/alice",
      "projects/p1/databases/(default)/documents/users/bob",
    ],
  });
  assertEquals(result.documents.length, 1);
  assertEquals(result.documents[0].data, { name: "Ada" });
  assertEquals(result.missing, ["projects/p1/databases/(default)/documents/users/bob"]);
  assertEquals(result.readTime, "2026-09-22T00:00:01Z");
});

Deno.test("documents-batch-get: an empty or blank list is refused before the request", async () => {
  const empty = mockCtx([], { display: DISPLAY });
  await assertRejects(async () => await action.execute({ paths: [] }, empty.ctx), Error, "`paths`");
  await assertRejects(
    async () => await action.execute({ paths: "  " }, empty.ctx),
    Error,
    "`paths`",
  );
  assertEquals(empty.calls.length, 0);
});
