import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/department-people-add.ts";

const conn = { display: { environment: "production", companyId: "co-1" } };

/** Employees and contractors are separate lists, as everywhere in Gusto. */
Deno.test("department-people-add: sends the two lists separately", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "d1" } }], conn);
  await action.execute!({
    departmentId: "d1",
    version: "v",
    employeeIds: "e1,e2",
    contractorIds: "c1",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/v1/departments/d1/add");
  assertEquals(JSON.parse(calls[0].body!), {
    version: "v",
    employees: [{ uuid: "e1" }, { uuid: "e2" }],
    contractors: [{ uuid: "c1" }],
  });
});

Deno.test("department-people-add: the version is required", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ departmentId: "d1", employeeIds: "e1" }, ctx),
    Error,
    "version",
  );
  assertEquals(calls.length, 0);
});

Deno.test("department-people-add: adding nobody is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ departmentId: "d1", version: "v" }, ctx),
    Error,
    "employeeIds",
  );
});
