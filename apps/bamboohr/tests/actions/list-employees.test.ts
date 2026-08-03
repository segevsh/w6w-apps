import { assert, assertEquals } from "@std/assert";
import listEmployees from "../../actions/list-employees.ts";
import { mockCtx, param } from "../_helpers.ts";

Deno.test("list-employees: is a search against /employees", async () => {
  assertEquals(listEmployees.type, "search");
  const { ctx, calls } = mockCtx([{ body: { data: [], meta: {} } }]);
  await listEmployees.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-employees: pagination uses the documented deepObject page[...] keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listEmployees.execute({ limit: 100, after: "cur_abc" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("page[limit]"), "100");
  assertEquals(q.get("page[after]"), "cur_abc");
  assertEquals(q.has("page[before]"), false);
});

Deno.test("list-employees: filter is encoded deepObject, one key per condition", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listEmployees.execute({ filter: { firstName: "Ava", status: "Active" } }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filter[firstName]"), "Ava");
  assertEquals(q.get("filter[status]"), "Active");
  // Never a JSON blob under a bare `filter` key.
  assertEquals(q.has("filter"), false);
});

Deno.test("list-employees: an array filter value becomes the comma-separated form", async () => {
  // Documented for ids: "`filter[ids]` accepts ... a single comma-separated string".
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listEmployees.execute({ filter: { ids: ["123", "124"] } }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter[ids]"), "123,124");
});

Deno.test("list-employees: empty filter entries are dropped, not sent blank", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listEmployees.execute({ filter: { a: "1", b: "", c: null, d: undefined } }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("filter[a]"), "1");
  for (const k of ["b", "c", "d"]) assertEquals(q.has(`filter[${k}]`), false, k);
});

Deno.test("list-employees: sort passes through, including the descending prefix", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listEmployees.execute({ sort: "lastName,-employeeId" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sort"), "lastName,-employeeId");
});

Deno.test("list-employees: says fields here ADDS to a default set, unlike get-employee", () => {
  // The distinction is real and easy to get backwards: `GET /employees/{id}`
  // returns only `id` without `fields`; this one has a default set.
  assert(/beyond|add/i.test(param(listEmployees, "fields").hint ?? ""));
});
