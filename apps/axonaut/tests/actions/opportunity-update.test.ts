import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import opportunityUpdate from "../../actions/opportunity-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "opportunityId": 42,
  "amount": 6000,
  "probability": 70,
  "name": "Bigger deal",
  "comments": "hotter",
  "pipe_step_name": "Proposal",
  "due_date_ts": 1790000000,
  "business_manager_email": "m@a.fr",
  "custom_fields": '{"Source": "web"}',
};

Deno.test("opportunity-update: PATCH /api/v2/opportunities/42 with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1 } }]);
  const out = await opportunityUpdate.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/opportunities/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "amount": 6000,
    "probability": 70,
    "name": "Bigger deal",
    "comments": "hotter",
    "pipe_step_name": "Proposal",
    "due_date_ts": 1790000000,
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

Deno.test("opportunity-update: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await opportunityUpdate.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("opportunity-update: invalid JSON in custom_fields is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () =>
    await (opportunityUpdate.execute({
      ...({
        "opportunityId": 42,
        "amount": 6000,
        "probability": 70,
        "name": "Bigger deal",
        "comments": "hotter",
        "pipe_step_name": "Proposal",
        "due_date_ts": 1790000000,
        "business_manager_email": "m@a.fr",
        "custom_fields": '{"Source": "web"}',
      }),
      "custom_fields": "{not json",
    } as never, ctx))
  );
  assertStringIncludes((err as Error).message, "Axonaut: custom_fields");
  assertEquals(calls.length, 0);
});
