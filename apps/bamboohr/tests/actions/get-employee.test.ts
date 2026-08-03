import { assert, assertEquals } from "@std/assert";
import getEmployee from "../../actions/get-employee.ts";
import { mockCtx, param } from "../_helpers.ts";

Deno.test("get-employee: is a read against /employees/{id}", async () => {
  assertEquals(getEmployee.type, "read");
  const { ctx, calls } = mockCtx([{ body: { id: "42", firstName: "Ava" } }]);
  const out = await getEmployee.execute({ id: "42", fields: "firstName,workEmail" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/employees/42");
  assertEquals(url.searchParams.get("fields"), "firstName,workEmail");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: "42", firstName: "Ava" });
});

Deno.test("get-employee: sends the comma-separated fields form verbatim", async () => {
  // This endpoint accepts ONLY the comma-separated form — "Bracket-array
  // (`fields[]=...`) and repeated-key (`fields=a&fields=b`) forms are not
  // supported on this endpoint". Mixing name / numeric id / custom alias in one
  // value is documented and must pass through untouched.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getEmployee.execute({ id: "1", fields: "firstName,1349,customStartDate" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "firstName,1349,customStartDate");
  assertEquals(url.searchParams.getAll("fields").length, 1);
  assert(!url.search.includes("fields[]"), "must not use the bracket-array form");
});

Deno.test("get-employee: the documented `0` sentinel is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "0" } }]);
  await getEmployee.execute({ id: "0" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/0");
});

Deno.test("get-employee: onlyCurrent=false is sent, and omission sends nothing", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await getEmployee.execute({ id: "1", onlyCurrent: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("onlyCurrent"), "false");

  await getEmployee.execute({ id: "1" }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("onlyCurrent"), false);
});

Deno.test("get-employee: an id needing encoding is escaped into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getEmployee.execute({ id: "a b/c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/a%20b%2Fc");
});

Deno.test("get-employee: warns at the form that fields is opt-in and id is internal", () => {
  // Both are silent failures: no `fields` returns a body with only `id`, and an
  // Employee # may resolve to a DIFFERENT employee.
  assert(/only `id`|no implicit default/i.test(param(getEmployee, "fields").hint ?? ""));
  const idHint = param(getEmployee, "id").hint ?? "";
  assert(/INTERNAL/.test(idHint));
  assert(/different employee/i.test(idHint));
  assertEquals(param(getEmployee, "id").required, true);
});
