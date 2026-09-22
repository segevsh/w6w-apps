import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

const DOC = {
  name: "projects/p1/databases/(default)/documents/users/alice",
  fields: { name: { stringValue: "Ada" }, age: { integerValue: "36" } },
  createTime: "2026-09-22T00:00:00Z",
  updateTime: "2026-09-22T00:00:01Z",
};

Deno.test("document-get: GETs the document path and returns raw fields plus decoded data", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: DOC }], { display: DISPLAY });

  const result = await action.execute({ path: "users/alice" }, ctx) as {
    data?: Record<string, unknown>;
    fields?: unknown;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice",
  );
  assertEquals(result.data, { name: "Ada", age: 36 });
  // The raw typed map is kept alongside.
  assertEquals(result.fields, DOC.fields);
});

Deno.test("document-get: a comma-separated mask becomes repeated query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: DOC }], { display: DISPLAY });
  await action.execute({ path: "users/alice", mask: "name, address.city", readTime: "t" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("mask.fieldPaths"), ["name", "address.city"]);
  assertEquals(url.searchParams.get("readTime"), "t");
});

Deno.test("document-get: a full resource name is used as-is", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: DOC }], { display: DISPLAY });
  await action.execute({ path: "projects/other/databases/n/documents/users/alice" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/other/databases/n/documents/users/alice",
  );
});

Deno.test("document-get: a collection path is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: DISPLAY });
  await assertRejects(
    async () => await action.execute({ path: "users" }, ctx),
    Error,
    "collection",
  );
  assertEquals(calls.length, 0);
});
