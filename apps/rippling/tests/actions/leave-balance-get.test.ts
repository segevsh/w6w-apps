import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import leaveBalanceGet from "../../actions/leave-balance-get.ts";

Deno.test("leave-balance-get: GETs /leave-balances/<id>/ with the id URL-encoded and returns the record bare", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "a b/1", created_at: "2025-01-01T00:00:00+00:00" },
  }]);
  const out = await leaveBalanceGet.execute({ id: "a b/1", expand: "worker" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/leave-balances/a%20b%2F1/");
  assertEquals(queryOf(calls[0].url), { expand: "worker" });
  assertEquals(out.id, "a b/1");
});

Deno.test("leave-balance-get: refuses an empty id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve().then(() => leaveBalanceGet.execute({ id: "  " }, ctx)),
    Error,
    "id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("leave-balance-get: a 404 surfaces Rippling's message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Not found.") }]);
  const err = await assertRejects(
    () => Promise.resolve().then(() => leaveBalanceGet.execute({ id: "x" }, ctx)),
    Error,
  );
  assertStringIncludes(err.message, "404");
  assertStringIncludes(err.message, "Not found.");
});

Deno.test("leave-balance-get: declares its scope and an id param, and sends no credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "x" } }]);
  await leaveBalanceGet.execute({ id: "x" }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertStringIncludes(leaveBalanceGet.description ?? "", "leave-balances.read");
  assertEquals(leaveBalanceGet.params![0].key, "id");
  assertEquals(leaveBalanceGet.params![0].required, true);
});
