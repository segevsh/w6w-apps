import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/verification-email-send.ts";

const conn = { display: { domain: "acme.us.auth0.com" } };

Deno.test("verification-email-send: queues the job", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "job_1", status: "pending" } }], conn);
  const out = await action.execute!({ userId: "auth0|1" }, ctx) as { status: string };
  assertEquals(out.status, "pending");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/jobs/verification-email");
});

/** A 201 is "queued", not "delivered". */
Deno.test("verification-email-send: says it returns a job, and is not idempotent", () => {
  assert(/JOB/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});

Deno.test("verification-email-send: a missing user is refused", async () => {
  const { ctx } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "userId");
});
