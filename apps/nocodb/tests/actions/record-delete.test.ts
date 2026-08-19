import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-delete.ts";

const D = { display: { host: "https://nocodb.internal" } };
const ok = {
  status: 200,
  body: [{ Id: 1 }, { Id: 2 }],
  headers: { "x-ratelimit-remaining": "50" },
};

Deno.test("record-delete: sends the ids in the body", async () => {
  const { ctx, calls } = mockCtx([ok], D);
  const result = await action.execute(
    { tableId: "mtbl1", recordIds: "1, 2", confirm: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), [{ Id: "1" }, { Id: "2" }]);
  assertEquals(result.deleted, 2);
  assertEquals(result.requestsRemaining, 50);
});

Deno.test("record-delete: a JSON array of ids works too", async () => {
  const { ctx, calls } = mockCtx([ok], D);
  await action.execute({ tableId: "mtbl1", recordIds: "[1,2]", confirm: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [{ Id: 1 }, { Id: 2 }]);
});

Deno.test("record-delete: honours a different primary key column", async () => {
  const { ctx, calls } = mockCtx([ok], D);
  await action.execute(
    { tableId: "mtbl1", recordIds: "A1", idField: "sku", confirm: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), [{ sku: "A1" }]);
});

/** NocoDB's API has no undo, and an external base loses the row too. */
Deno.test("record-delete: refuses without confirmation, before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", recordIds: "1" }, ctx),
    Error,
  );
  assert(/no undo/.test(err.message), err.message);
  assert(/external database/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("record-delete: refuses an empty id list, and says there is no filter", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", recordIds: "", confirm: true }, ctx),
    Error,
  );
  assert(/no delete-by-filter/.test(err.message), err.message);
});

/** A link left behind renders as an empty cell rather than an error. */
Deno.test("record-delete: warns about the links it breaks", async () => {
  const { ctx, logs } = mockCtx([ok], D);
  await action.execute({ tableId: "mtbl1", recordIds: "1", confirm: true }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /empty cell rather than an error/.test(l.message)),
    JSON.stringify(logs),
  );
});
