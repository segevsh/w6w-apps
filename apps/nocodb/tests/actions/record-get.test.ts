import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-get.ts";

const D = { display: { host: "https://nocodb.internal" } };

Deno.test("record-get: fetches by primary key and lists the column names", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { Id: 7, Title: "A row", Amount: 42 },
  }], D);
  const result = await action.execute({ tableId: "mtbl1", recordId: "7" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tables/mtbl1/records/7");
  assertEquals(result.id, "7");
  assertEquals(result.fields, ["Id", "Title", "Amount"]);
});

Deno.test("record-get: a fields list keeps the response small", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 7 } }], D);
  await action.execute({ tableId: "mtbl1", recordId: "7", fields: "Id, Title" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "Id,Title");
});

Deno.test("record-get: requires both ids", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({ recordId: "7" }, ctx), Error, "`tableId`");
  await assertRejects(
    async () => await action.execute({ tableId: "mtbl1" }, ctx),
    Error,
    "`recordId` is required",
  );
  assertEquals(calls.length, 0);
});

/** An empty list and a 404 are different answers. */
Deno.test("record-get: says it is the exact read", () => {
  assert(/rather than an empty result/.test(action.description!), action.description);
  assertEquals(action.type, "read");
});
