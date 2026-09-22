import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create.ts";

const CREATED = {
  name: "projects/p1/databases/(default)/documents/users/alice",
  fields: { name: { stringValue: "Ada" } },
  createTime: "2026-09-22T00:00:00Z",
  updateTime: "2026-09-22T00:00:00Z",
};

Deno.test("document-create: POSTs to parent + collectionId with typed fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: CREATED }], { display: DISPLAY });

  await action.execute(
    { collectionPath: "users", documentId: "alice", data: { name: "Ada" } },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("documentId"), "alice");
  assertEquals(JSON.parse(calls[0].body!), { fields: { name: { stringValue: "Ada" } } });
});

Deno.test("document-create: no documentId omits the query param, so Firestore assigns one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: CREATED }], { display: DISPLAY });
  await action.execute({ collectionPath: "users", data: { name: "Ada" } }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("documentId"), false);
});

Deno.test("document-create: a subcollection splits the parent document off", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: CREATED }], { display: DISPLAY });
  await action.execute({ collectionPath: "users/alice/orders", data: {} }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice/orders",
  );
});

Deno.test("document-create: `data` must be a JSON object", async () => {
  const { ctx, calls } = mockCtx([], { display: DISPLAY });
  await assertRejects(
    async () => await action.execute({ collectionPath: "users", data: "[1,2]" }, ctx),
    Error,
    "`data`",
  );
  await assertRejects(
    async () => await action.execute({ collectionPath: "users" }, ctx),
    Error,
    "`data`",
  );
  assertEquals(calls.length, 0);
});
