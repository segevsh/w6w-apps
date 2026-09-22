import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/document-update.ts";

const UPDATED = {
  name: "projects/p1/databases/(default)/documents/users/alice",
  fields: { age: { integerValue: "37" } },
};

Deno.test("document-update: PATCHes with a repeated updateMask.fieldPaths", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: UPDATED }], { display: DISPLAY });

  await action.execute({ path: "users/alice", mask: "age, address.city", data: { age: 37 } }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents/users/alice",
  );
  assertEquals(new URL(calls[0].url).searchParams.getAll("updateMask.fieldPaths"), [
    "age",
    "address.city",
  ]);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "projects/p1/databases/(default)/documents/users/alice",
    fields: { age: { integerValue: "37" } },
  });
});

/** No mask is Firestore's documented "overwrite the document" default. */
Deno.test("document-update: a blank mask sends no updateMask at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: UPDATED }], { display: DISPLAY });
  await action.execute({ path: "users/alice", data: { age: 37 } }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("updateMask.fieldPaths"), false);
});

Deno.test("document-update: the existence precondition maps to a boolean query param", async () => {
  const exists = mockCtx([{ status: 200, body: UPDATED }], { display: DISPLAY });
  await action.execute({ path: "users/alice", data: {}, exists: "exists" }, exists.ctx);
  assertEquals(new URL(exists.calls[0].url).searchParams.get("currentDocument.exists"), "true");

  const missing = mockCtx([{ status: 200, body: UPDATED }], { display: DISPLAY });
  await action.execute({ path: "users/alice", data: {}, exists: "missing" }, missing.ctx);
  assertEquals(new URL(missing.calls[0].url).searchParams.get("currentDocument.exists"), "false");

  const none = mockCtx([{ status: 200, body: UPDATED }], { display: DISPLAY });
  await action.execute({ path: "users/alice", data: {} }, none.ctx);
  assertEquals(new URL(none.calls[0].url).searchParams.has("currentDocument.exists"), false);
});

Deno.test("document-update: updateTime is the optimistic-concurrency precondition", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: UPDATED }], { display: DISPLAY });
  await action.execute(
    { path: "users/alice", data: {}, currentUpdateTime: "2026-09-22T00:00:00Z" },
    ctx,
  );
  assertEquals(
    new URL(calls[0].url).searchParams.get("currentDocument.updateTime"),
    "2026-09-22T00:00:00Z",
  );
});

Deno.test("document-update: decodes the patched document and requires `data`", async () => {
  const { ctx } = mockCtx([{ status: 200, body: UPDATED }], { display: DISPLAY });
  const result = await action.execute({ path: "users/alice", data: { age: 37 } }, ctx) as {
    data?: unknown;
  };
  assertEquals(result.data, { age: 37 });

  const empty = mockCtx([], { display: DISPLAY });
  await assertRejects(
    async () => await action.execute({ path: "users/alice" }, empty.ctx),
    Error,
    "`data`",
  );
  assertEquals(empty.calls.length, 0);
});
