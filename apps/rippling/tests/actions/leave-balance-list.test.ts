import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { API_ROOT, errorBody, listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import leaveBalanceList from "../../actions/leave-balance-list.ts";

const NEXT = `${API_ROOT}/leave-balances/?cursor=abc%3D&limit=2`;

Deno.test("leave-balance-list: GETs /leave-balances/ with every query parameter and shapes the page", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: listBody([{ id: "r1" }], NEXT, {
        __meta: {
          redacted_fields: [{ name: "date_of_birth", reason: "Insufficient entitlements" }],
        },
      }),
    },
  ]);
  const out = await leaveBalanceList.execute({
    limit: 2,
    cursor: "prev-cursor",
    orderBy: "created_at desc",
    filter: "worker_id eq 'x'",
    expand: "worker",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/leave-balances/");
  assertEquals(queryOf(calls[0].url), {
    limit: "2",
    cursor: "prev-cursor",
    order_by: "created_at desc",
    filter: "worker_id eq 'x'",
    expand: "worker",
  });
  assertEquals(out.results, [{ id: "r1" }]);
  assertEquals(out.nextCursor, "abc=");
  assertEquals(out.nextLink, NEXT);
  assertEquals(out.redactedFields, [{
    name: "date_of_birth",
    reason: "Insufficient entitlements",
  }]);
});

Deno.test("leave-balance-list: last page has a null cursor and sends no stray parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([]) }]);
  const out = await leaveBalanceList.execute({}, ctx) as Record<string, unknown>;

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.results, []);
  assertEquals(out.nextCursor, null);
  assertEquals(out.redactedFields, []);
});

Deno.test("leave-balance-list: a pasted next_link URL is reduced to its cursor, never fetched", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([]) }]);
  await leaveBalanceList.execute({ cursor: NEXT }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/leave-balances/");
  assertEquals(queryOf(calls[0].url), { cursor: "abc=" });
});

Deno.test("leave-balance-list: sends no credential (sign owns it) and declares its scope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([]) }]);
  await leaveBalanceList.execute({}, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].url.startsWith(API_ROOT + "/"), true);
  assertStringIncludes(leaveBalanceList.description ?? "", "leave-balances.read");
  assertEquals(leaveBalanceList.type, "read");
  assert(leaveBalanceList.params!.some((p) => p.key === "limit" && p.validation?.max === 100));
});

Deno.test("leave-balance-list: a 403 surfaces Rippling's message, the status and the scope hint", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("Insufficient oauth scopes to access leave-balance"),
      headers: { "content-type": "application/json", "x-rippling-request-id": "Root=1-abc" },
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve().then(() => leaveBalanceList.execute({}, ctx)),
    Error,
  );
  assertStringIncludes(err.message, "403");
  assertStringIncludes(err.message, "Insufficient oauth scopes");
  assertStringIncludes(err.message, "Root=1-abc");
});
