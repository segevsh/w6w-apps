import { assert, assertEquals } from "@std/assert";
import getEmployeesDirectory from "../../actions/get-employees-directory.ts";
import { description, mockCtx } from "../_helpers.ts";

Deno.test("get-employees-directory: is a search against /employees/directory", async () => {
  assertEquals(getEmployeesDirectory.type, "search");
  const { ctx, calls } = mockCtx([{ body: { fields: [], employees: [] } }]);
  await getEmployeesDirectory.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/directory");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-employees-directory: takes no fields param — the company chooses them", async () => {
  const keys = (getEmployeesDirectory.params ?? []).map((p) => p.key);
  assertEquals(keys, ["onlyCurrent"]);
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await getEmployeesDirectory.execute({ onlyCurrent: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("onlyCurrent"), "false");
});

Deno.test("get-employees-directory: says it is governed by sharing settings", () => {
  // The line between this and List Employees: no per-record permission gate,
  // but it can be switched off entirely for an access level.
  assert(/sharing/i.test(description(getEmployeesDirectory)));
});
