import { assertEquals, assertRejects } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/job-update.ts";

Deno.test("job-update: PUTs only the changed fields to /jobs/{id}", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "8" } },
  }]);
  const out = await action.execute({ jobId: 8, ...{ "title": "J2", "statusId": 4 } }, ctx);
  assertEquals(out, { id: "8" });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/jobs/8");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "title": "J2",
    "status_id": "4",
  });
});

Deno.test("job-update: refuses an update that sets nothing, without a request", async () => {
  const { ctx, calls } = mockAcceloCtx([]);
  await assertRejects(
    async () => await action.execute({ jobId: 8 }, ctx),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
