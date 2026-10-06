import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/job-update-address.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("job-update-address: sends PUT /jobs/j1/address and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute(
    { jobId: "j1", city: "Detroit", zipCode: "48201" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/jobs/j1/address");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), { city: "Detroit", zipCode: "48201" });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { success: true });
});

Deno.test("job-update-address: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () =>
      await action.execute({ jobId: "j1", city: "Detroit", zipCode: "48201" } as never, ctx),
    Error,
    "AccuLynx 404",
  );
});

Deno.test("job-update-address: refuses an update that changes nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ jobId: "j1" } as never, ctx),
    Error,
    "at least one",
  );
  assertEquals(calls.length, 0);
});
