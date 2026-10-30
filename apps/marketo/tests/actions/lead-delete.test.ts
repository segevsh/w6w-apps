import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-delete.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

test("lead-delete: POSTs to /rest/v1/leads/delete.json with an input array", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { success: true, result: [{ id: 1, status: "deleted" }, { id: 2, status: "deleted" }] },
    },
  ], conn);
  const out = await action.execute!({ leadIds: "1, 2", confirm: true }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://123-abc-456.mktorest.com/rest/v1/leads/delete.json");
  assertEquals(JSON.parse(calls[0].body!), { input: [{ id: 1 }, { id: 2 }] });
  assertEquals(out, [{ id: 1, status: "deleted" }, { id: 2, status: "deleted" }]);
});

test("lead-delete: refuses without confirm", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ leadIds: "1", confirm: false }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

test("lead-delete: requires at least one numeric lead ID", async () => {
  const { ctx } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ leadIds: "not-a-number", confirm: true }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

test("lead-delete: is gated behind an explicit confirmation", () => {
  const confirm = (action.params as Array<{ key: string; required?: boolean; default?: unknown }>)
    .find((p) => p.key === "confirm");
  assertEquals(confirm?.required, true);
  assertEquals(confirm?.default, false);
});

test("lead-delete: idempotent is true — re-deleting an already-deleted lead is a no-op", () => {
  assertEquals(action.idempotent, true);
});
