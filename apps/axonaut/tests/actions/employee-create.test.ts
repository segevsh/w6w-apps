import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import employeeCreate from "../../actions/employee-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "company_id": 42,
  "gender": "1",
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "j@d.fr",
  "phone_number": "0102030405",
  "cellphone_number": "0602030405",
  "custom_fields": '{"Poste": "CEO"}',
  "is_billing_contact": true,
};

Deno.test("employee-create: POST /api/v2/employees with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await employeeCreate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/employees");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "company_id": 42,
    "gender": 1,
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "j@d.fr",
    "phone_number": "0102030405",
    "cellphone_number": "0602030405",
    "custom_fields": {
      "Poste": "CEO",
    },
    "is_billing_contact": true,
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("employee-create: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await employeeCreate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("employee-create: invalid JSON in custom_fields is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (employeeCreate.execute({
      ...({
        "company_id": 42,
        "gender": "1",
        "firstname": "Jane",
        "lastname": "Doe",
        "email": "j@d.fr",
        "phone_number": "0102030405",
        "cellphone_number": "0602030405",
        "custom_fields": '{"Poste": "CEO"}',
        "is_billing_contact": true,
      }),
      "custom_fields": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: custom_fields");
  assertEquals(calls.length, 0);
});
