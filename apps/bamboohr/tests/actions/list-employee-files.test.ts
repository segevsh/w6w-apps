import { assertEquals } from "@std/assert";
import listEmployeeFiles from "../../actions/list-employee-files.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-employee-files: lists via /files/view, not /files", async () => {
  // `/files` is the upload collection; listing needs the `/view` suffix.
  assertEquals(listEmployeeFiles.type, "search");
  const { ctx, calls } = mockCtx([{ body: { categories: [] } }]);
  await listEmployeeFiles.execute({ id: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/42/files/view");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-employee-files: sends Accept: application/json — this endpoint defaults to XML", async () => {
  // The most explicit statement of the XML default in the whole API: this
  // endpoint's `Accept` parameter is documented with `default: application/xml`
  // and "Any other value (or omitted) returns XML."
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listEmployeeFiles.execute({ id: "1" }, ctx);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("list-employee-files: the employee id is required and escaped", async () => {
  assertEquals((listEmployeeFiles.params ?? []).map((p) => p.key), ["id"]);
  assertEquals(listEmployeeFiles.params![0].required, true);
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await listEmployeeFiles.execute({ id: "a/b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/a%2Fb/files/view");
});
