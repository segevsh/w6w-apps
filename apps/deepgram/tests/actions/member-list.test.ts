import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

const display = { projectId: "proj_1" };

Deno.test("member-list: reads who has access to the project", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { members: [{ member_id: "m1", email: "ada@acme.com" }] } }],
    { display },
  );
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/members");
  assertEquals(result.count, 1);
});

/** A run log is not the place for a staff roster. */
Deno.test("member-list: logs a count, not the people", async () => {
  const { ctx, logs } = mockCtx(
    [{ status: 200, body: { members: [{ email: "ada@acme.com" }] } }],
    { display },
  );
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

Deno.test("member-list: pairs itself with the key list", () => {
  assert(/key-list/.test(action.description!), action.description);
});
