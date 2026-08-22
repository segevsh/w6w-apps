import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-department-update.ts";

Deno.test("person-department-update: PUTs the department, replacing it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }], { display: {} });
  await action.execute!({ personId: "p1", departmentId: "d1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/rest/people/p1/department");
  assertEquals(JSON.parse(calls[0].body!), { data: { department_id: "d1" } });
});

Deno.test("person-department-update: both ids are required", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ personId: "p1" }, ctx),
    Error,
    "`departmentId`",
  );
  assertEquals(calls.length, 0);
});
