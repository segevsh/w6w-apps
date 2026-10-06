import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import opportunityCreate from "../../actions/opportunity-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "company_id": 42,
  "name": "Big deal",
  "amount": 5000,
  "probability": 60,
  "comments": "hot",
  "pipe_name": "Sales",
  "pipe_step_name": "Qualified",
  "due_date_ts": 1790000000,
  "pipe_step_date_ts": 1780000000,
  "employees": '[{"employee_email": "j@d.fr"}]',
  "business_manager_email": "m@a.fr",
  "custom_fields": '{"Source": "web"}',
};

Deno.test("opportunity-create: POST /api/v2/opportunities with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await opportunityCreate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/opportunities");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "company_id": 42,
    "name": "Big deal",
    "amount": 5000,
    "probability": 60,
    "comments": "hot",
    "pipe_name": "Sales",
    "pipe_step_name": "Qualified",
    "due_date_ts": 1790000000,
    "pipe_step_date_ts": 1780000000,
    "employees": [
      {
        "employee_email": "j@d.fr",
      },
    ],
    "business_manager_email": "m@a.fr",
    "custom_fields": {
      "Source": "web",
    },
  });
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { id: 1 });
});

Deno.test("opportunity-create: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await opportunityCreate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("opportunity-create: invalid JSON in employees is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (opportunityCreate.execute({
      ...({
        "company_id": 42,
        "name": "Big deal",
        "amount": 5000,
        "probability": 60,
        "comments": "hot",
        "pipe_name": "Sales",
        "pipe_step_name": "Qualified",
        "due_date_ts": 1790000000,
        "pipe_step_date_ts": 1780000000,
        "employees": '[{"employee_email": "j@d.fr"}]',
        "business_manager_email": "m@a.fr",
        "custom_fields": '{"Source": "web"}',
      }),
      "employees": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: employees");
  assertEquals(calls.length, 0);
});
