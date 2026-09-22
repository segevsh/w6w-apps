import { assertEquals, assertRejects } from "@std/assert";
import listCustomers from "../../actions/list-customers.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = listEnvelope("customers", [{ id: "CU1", email: "a@b.co" }], {
  after: "CURSOR_AFTER",
  limit: 50,
});

Deno.test("list-customers: GET /customers with the cursors lifted out of meta", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await listCustomers.execute!({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/customers");
  assertEquals(out.items, [{ id: "CU1", email: "a@b.co" }]);
  assertEquals(out.afterCursor, "CURSOR_AFTER");
  assertEquals(out.beforeCursor, null);
  assertEquals(out.limit, 50);
});

Deno.test("list-customers: blank filters are dropped, set ones use the vendor's query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await listCustomers.execute!({
    limit: 10,
    after: "C1",
    currency: "GBP",
    actionRequired: "false",
    sortField: "created_at",
    sortDirection: "desc",
    createdAtGte: "2026-01-01T00:00:00Z",
    createdAtLt: "",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    limit: "10",
    after: "C1",
    currency: "GBP",
    // GoCardless's own two literal strings, not a boolean.
    action_required: "false",
    sort_field: "created_at",
    sort_direction: "desc",
    "created_at[gte]": "2026-01-01T00:00:00Z",
  });
});

Deno.test("list-customers: an empty collection reports null cursors, not undefined", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope("customers", []) }]);
  const out = await listCustomers.execute!({}, ctx);
  assertEquals(out.items, []);
  assertEquals(out.afterCursor, null);
});

Deno.test("list-customers: a vendor validation error names the offending field", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("validation_failed", {
      code: 422,
      message: "Validation failed",
      errors: [{ field: "currency", message: "is not included in the list" }],
    }),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(listCustomers.execute!({ currency: "XXX" }, ctx)),
    Error,
  );
  assertEquals(
    err.message.includes("GoCardless 422 validation_failed/currency"),
    true,
    err.message,
  );
  assertEquals(err.message.includes("GET /customers"), true, err.message);
  assertEquals(err.message.includes("is not included in the list"), true, err.message);
});
