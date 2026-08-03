import { assert, assertEquals } from "@std/assert";
import createEmployee from "../../actions/create-employee.ts";
import { mockCtx, param } from "../_helpers.ts";

Deno.test("create-employee: POSTs to /employees and is non-idempotent", async () => {
  assertEquals(createEmployee.type, "perform");
  assertEquals(createEmployee.idempotent, false);

  const { ctx, calls } = mockCtx([{ status: 201, body: "" }]);
  const out = await createEmployee.execute({ firstName: "Ava", lastName: "Ng" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Ava", lastName: "Ng" });
  assertEquals(out, { status: 201 });
});

Deno.test("create-employee: only the two documented minimums are required", () => {
  const required = (createEmployee.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["firstName", "lastName"]);
});

Deno.test("create-employee: unset optional params are omitted, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: "" }]);
  await createEmployee.execute({ firstName: "Ava", lastName: "Ng", jobTitle: undefined }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), ["firstName", "lastName"]);
});

Deno.test("create-employee: additional fields merge in, and named params win", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: "" }]);
  await createEmployee.execute({
    firstName: "Ava",
    lastName: "Ng",
    department: "Eng",
    fields: { division: "West", department: "Sales" },
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    division: "West",
    firstName: "Ava",
    lastName: "Ng",
    department: "Eng",
  });
});

Deno.test("create-employee: names the 409-on-duplicate-email behaviour at the form", () => {
  // The only duplicate protection this endpoint has, and the reason a retry
  // without an email creates a second person.
  assert(/409|duplicate/i.test(param(createEmployee, "workEmail").hint ?? ""));
});
