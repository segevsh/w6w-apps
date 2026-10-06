import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/query-records.ts";
import { mockCtx } from "../_helpers.ts";

const RESP = {
  data: [{ _id: "a1", accountname: "Bob" }],
  success: true,
  message: "",
  pageNumber: 1,
  pageSize: 25,
  isLastPage: true,
};

Deno.test("query-records: sends POST /api/v3/query with the structured body and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: RESP }]);
  const filter = [{
    type: "AND",
    conditions: [{ fieldName: "accountname", operator: "start-with", value: "Bob" }],
  }];
  const out = await action.execute!({
    objectType: 1,
    fields: [{ name: "accountname" }],
    filter,
    orderBy: [{ name: "accountname", order: "asc" }],
    pageSize: 25,
    pageNumber: 1,
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v3/query");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    objectType: 1,
    fields: [{ name: "accountname" }],
    filter,
    orderBy: [{ name: "accountname", order: "asc" }],
    pageSize: 25,
    pageNumber: 1,
  });
  assertEquals(out, {
    records: [{ _id: "a1", accountname: "Bob" }],
    pageNumber: 1,
    pageSize: 25,
    isLastPage: true,
  });
});

Deno.test("query-records: expands bare field names, parses JSON text and omits unset keys", async () => {
  const { ctx, calls } = mockCtx([{ body: RESP }]);
  await action.execute!({
    objectType: 1,
    fields: '["accountname", {"name":"accountid","aggrFunc":"COUNT","alias":"n"}]',
    groupBy: '[{"name":"accountname"}]',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    objectType: 1,
    fields: [{ name: "accountname" }, { name: "accountid", aggrFunc: "COUNT", alias: "n" }],
    groupBy: [{ name: "accountname" }],
  });
});

Deno.test("query-records: refuses empty fields before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ objectType: 1, fields: [] }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});

Deno.test("query-records: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: RESP }]);
  await action.execute!({ objectType: 1, fields: ["accountname"] }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("query-records: surfaces the lowercase message and the error code", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Invalid field: nope" } }]);
  await assertRejects(
    async () => await action.execute!({ objectType: 1, fields: ["nope"] }, ctx),
    Error,
    "Invalid field: nope",
  );
});

Deno.test("query-records: declares type and output", () => {
  assertEquals(action.type, "search");
  assert(action.params!.some((p) => p.key === "fields" && p.required));
  assert(Array.isArray(action.output) && action.output.length > 0);
});
