import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/link-list.ts";

const D = { display: { host: "https://nocodb.internal" } };

/** Linked records do not come back with the parent record. */
Deno.test("link-list: reads the link endpoint, keyed by the field id", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { list: [{ Id: 5 }, { Id: 6 }], pageInfo: { totalRows: 2 } },
    headers: { "x-ratelimit-remaining": "40" },
  }], D);
  const result = await action.execute(
    { tableId: "mtbl1", linkFieldId: "cl1", recordId: "3" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tables/mtbl1/links/cl1/records/3");
  assertEquals(result.ids, [5, 6]);
  assertEquals(result.isEmpty, false);
  assertEquals(result.requestsRemaining, 40);
});

Deno.test("link-list: an empty link is reported as empty rather than missing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { list: [] } }], D);
  const result = await action.execute(
    { tableId: "mtbl1", linkFieldId: "cl1", recordId: "3" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.isEmpty, true);
  assertEquals(result.count, 0);
});

/** Everybody has the field's name; the endpoint wants its id. */
Deno.test("link-list: the missing-field error names where the id comes from", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", recordId: "3" }, ctx),
    Error,
  );
  assert(/ID rather than its name/.test(err.message), err.message);
  assert(/table-get/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** One request per record per field, against sixty a minute. */
Deno.test("link-list: says filtering the child table is often cheaper", () => {
  assert(
    /filtering the child table is often cheaper/.test(action.description!),
    action.description,
  );
});
