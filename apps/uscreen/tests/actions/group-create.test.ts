import { assertEquals, assertRejects } from "@std/assert";
import groupCreate from "../../actions/group-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("group-create: sends POST /groups", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 2 } }]);
  const out = await groupCreate.execute(
    { "name": "Acme", "billingEmail": "b@a.co", "planId": 8, "numberOfSeats": 5 } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/groups");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    "name": "Acme",
    "billing_email": "b@a.co",
    "plan_id": 8,
    "number_of_seats": 5,
  });
  assertEquals(out, { "id": 2 });
});

Deno.test("group-create: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      groupCreate.execute(
        { "name": "Acme", "billingEmail": "b@a.co", "planId": 8, "numberOfSeats": 5 } as never,
        ctx,
      ) as Promise<unknown>,
    Error,
    "bad input",
  );
});
