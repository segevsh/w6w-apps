import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-list.ts";

/** HRIS collections page by offset — a cursor here returns page one forever. */
Deno.test("person-list: uses the OFFSET pager", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "p1" }], page: { total_rows: 2 } } },
    { status: 200, body: { data: [{ id: "p2" }], page: { total_rows: 2 } } },
  ], { display: {} });
  const result = await action.execute!({ returnAll: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/people");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "1");
  assertEquals(new URL(calls[0].url).searchParams.get("after_cursor"), null);
  assertEquals(result, [{ id: "p1" }, { id: "p2" }]);
});

Deno.test("person-list: search and team filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], page: {} } }], { display: {} });
  await action.execute!({ search: "ann", teams: "t1,t2" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("search"), "ann");
  assertEquals(q.getAll("teams"), ["t1", "t2"]);
});
