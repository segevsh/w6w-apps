import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import employeeUpdate from "../../actions/employee-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "employeeId": 42,
  "gender": "1",
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "j@d.fr",
  "phone_number": "0102030405",
  "cellphone_number": "0602030405",
  "custom_fields": '{"Poste": "CEO"}',
};

Deno.test("employee-update: PATCH /api/v2/employees/42 with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await employeeUpdate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/employees/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "gender": 1,
    "firstname": "Jane",
    "lastname": "Doe",
    "email": "j@d.fr",
    "phone_number": "0102030405",
    "cellphone_number": "0602030405",
    "custom_fields": {
      "Poste": "CEO",
    },
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("employee-update: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await employeeUpdate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("employee-update: invalid JSON in custom_fields is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (employeeUpdate.execute({
      ...({
        "employeeId": 42,
        "gender": "1",
        "firstname": "Jane",
        "lastname": "Doe",
        "email": "j@d.fr",
        "phone_number": "0102030405",
        "cellphone_number": "0602030405",
        "custom_fields": '{"Poste": "CEO"}',
      }),
      "custom_fields": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: custom_fields");
  assertEquals(calls.length, 0);
});
