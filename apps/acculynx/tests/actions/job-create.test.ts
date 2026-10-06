import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-create.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-create: sends POST /jobs and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "j9", _link: "https://api.acculynx.com/api/v2/jobs/j9" },
  }]);
  const out = await action.execute(
    {
      contactId: "c1",
      leadSourceId: "ls1",
      street1: "1 Main",
      city: "Peoria",
      state: "MI",
      country: "US",
      zipCode: "48000",
      priority: "High",
      workTypeId: 103,
      tradeTypeIds: "t1, t2",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    contact: { id: "c1" },
    leadSource: { id: "ls1" },
    locationAddress: {
      street1: "1 Main",
      city: "Peoria",
      state: "MI",
      country: "US",
      zipCode: "48000",
    },
    priority: "High",
    workType: { id: 103 },
    tradeTypes: [{ id: "t1" }, { id: "t2" }],
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { id: "j9", _link: "https://api.acculynx.com/api/v2/jobs/j9" });
});

Deno.test("job-create: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute(
        {
          contactId: "c1",
          leadSourceId: "ls1",
          street1: "1 Main",
          city: "Peoria",
          state: "MI",
          country: "US",
          zipCode: "48000",
          priority: "High",
          workTypeId: 103,
          tradeTypeIds: "t1, t2",
        } as never,
        ctx,
      ),
    Error,
    "AccuLynx 404",
  );
});

Deno.test("job-create: a partial address is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ contactId: "c1", street1: "1 Main" } as never, ctx),
    Error,
    "city, state, country, zipCode",
  );
  assertEquals(calls.length, 0);
});

Deno.test("job-create: contact only is a valid minimal body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "j1" } }]);
  await action.execute({ contactId: "c1" } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contact: { id: "c1" } });
});
