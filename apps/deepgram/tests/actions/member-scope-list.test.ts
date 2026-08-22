import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-scope-list.ts";

const display = { projectId: "proj_1" };

Deno.test("member-scope-list: reports the scopes and flags the privileged ones", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { scopes: ["member", "admin"] } }],
    { display },
  );
  const result = await action.execute!({ memberId: "m1" }, ctx) as {
    scopes: string[];
    privileged: boolean;
  };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/members/m1/scopes");
  assertEquals(result.scopes, ["member", "admin"]);
  assertEquals(result.privileged, true);
});

Deno.test("member-scope-list: an ordinary member is not flagged", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { scopes: ["member"] } }], { display });
  const result = await action.execute!({ memberId: "m1" }, ctx) as { privileged: boolean };
  assertEquals(result.privileged, false);
});

Deno.test("member-scope-list: needs a member id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "memberId");
  assertEquals(calls.length, 0);
});

/** A member with owner can mint an owner key. */
Deno.test("member-scope-list: connects member scopes to key scopes", () => {
  assert(/owner key/.test(action.description!), action.description);
});
