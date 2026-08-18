import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invite-list.ts";

const display = { projectId: "proj_1" };

Deno.test("invite-list: reads the outstanding invitations", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { invites: [{ email: "new@acme.com", scope: "member" }] } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/invites");
  assertEquals(result.count, 1);
});

Deno.test("invite-list: logs a count, not the addresses", async () => {
  const { ctx, logs } = mockCtx(
    [{ status: 200, body: { invites: [{ email: "new@acme.com" }] } }],
    { display },
  );
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("new@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

/** An outstanding invitation is a pending grant that member-list cannot see. */
Deno.test("invite-list: says why it matters to an access review", () => {
  assert(/pending grants/.test(action.description!), action.description);
});
