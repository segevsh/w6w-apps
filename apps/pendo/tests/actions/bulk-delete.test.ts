import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-delete.ts";

const base = {
  kind: "visitor",
  ids: JSON.stringify(["v1", "v2"]),
  confirmPermanentDeletion: true,
};

test("bulk-delete: posts to the visitor endpoint with the ids wrapped in `visitors`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "job-1" } }]);
  const result = await action.execute!(base, ctx) as { id: string; requested: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/bulkdelete/visitor");
  assertEquals(JSON.parse(calls[0].body!), { visitors: ["v1", "v2"] });
  assertEquals(result.id, "job-1");
  assertEquals(result.requested, 2);
});

test("bulk-delete: the account endpoint wraps ids in `accounts`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "job-2" } }]);
  await action.execute!({ ...base, kind: "account", ids: JSON.stringify(["a1"]) }, ctx);
  assertEquals(calls[0].url, "https://app.pendo.io/api/v1/bulkdelete/account");
  assertEquals(JSON.parse(calls[0].body!), { accounts: ["a1"] });
});

test("bulk-delete: refuses to run without explicit confirmation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ ...base, confirmPermanentDeletion: false }, ctx),
    Error,
    "confirmPermanentDeletion",
  );
  assertEquals(calls.length, 0);
});

test("bulk-delete: `ids` must be a non-empty array", async () => {
  await assertRejects(
    async () => await action.execute!({ ...base, ids: "[]" }, mockCtx([]).ctx),
    Error,
    "non-empty",
  );
});

test("bulk-delete: `kind` must be visitor or account", async () => {
  await assertRejects(
    async () => await action.execute!({ ...base, kind: "widget" }, mockCtx([]).ctx),
    Error,
    "visitor",
  );
});

test("bulk-delete: logs a warning naming the count, never the raw ids", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { id: "job-1" } }]);
  await action.execute!(base, ctx);
  assert(logs.some((l) => l.level === "warn"));
  assert(!JSON.stringify(logs).includes("v1"));
});
