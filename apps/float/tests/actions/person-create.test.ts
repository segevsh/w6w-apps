import { assertEquals } from "@std/assert";
import personCreate from "../../actions/person-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("person-create - POSTs /people with the typed fields, dropping unset ones", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { people_id: 5, name: "New Person" } }]);
  const out = await personCreate.execute(
    { name: "New Person", active: true, employeeType: true },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/people");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "New Person");
  assertEquals(body.active, 1);
  assertEquals(body.employee_type, 1);
  assertEquals("email" in body, false);
  assertEquals(out, { people_id: 5, name: "New Person" });
});

Deno.test("person-create - extraFields is merged in and overrides typed fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await personCreate.execute(
    { name: "New Person", extraFields: { name: "Overridden", department: { department_id: 5 } } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "Overridden");
  assertEquals(body.department, { department_id: 5 });
});
