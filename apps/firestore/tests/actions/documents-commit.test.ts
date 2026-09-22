import { assertEquals, assertRejects } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/documents-commit.ts";

Deno.test("documents-commit: POSTs an atomic Write array built from set/update/delete entries", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { writeResults: [{ updateTime: "t1" }, { updateTime: "t2" }], commitTime: "c" },
  }], { display: DISPLAY });

  const writes = [
    { op: "set", path: "users/alice", data: { name: "Ada" } },
    { op: "update", path: "users/alice", mask: "age", data: { age: 37 } },
    { op: "delete", path: "users/bob", exists: true },
  ];
  const result = await action.execute({ writes: JSON.stringify(writes) }, ctx) as {
    commitTime?: string;
    writeResults?: unknown[];
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/projects/p1/databases/(default)/documents:commit",
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.writes.length, 3);
  assertEquals(body.writes[0].update.name, "projects/p1/databases/(default)/documents/users/alice");
  assertEquals(body.writes[1].updateMask, { fieldPaths: ["age"] });
  assertEquals(body.writes[2], {
    delete: "projects/p1/databases/(default)/documents/users/bob",
    currentDocument: { exists: true },
  });
  assertEquals(body.transaction, undefined);
  assertEquals(result.commitTime, "c");
  assertEquals(result.writeResults?.length, 2);
});

Deno.test("documents-commit: a transaction id is passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: DISPLAY });
  await action.execute({
    writes: [{ op: "delete", path: "users/bob" }],
    transaction: "dHhu",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).transaction, "dHhu");
});

Deno.test("documents-commit: an empty writes array is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display: DISPLAY });
  await assertRejects(async () => await action.execute({ writes: [] }, ctx), Error, "`writes`");
  assertEquals(calls.length, 0);
});
