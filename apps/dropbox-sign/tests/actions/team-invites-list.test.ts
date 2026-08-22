import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/team-invites-list.ts";

/** This endpoint pages nothing — it answers with the whole list. */
Deno.test("team-invites-list: makes one unpaged call and returns the array", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { team_invites: [{ email_address: "a" }] },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ email_address: "a" }]);
  assertEquals(calls.length, 1);
  assertEquals(new URL(calls[0].url).searchParams.get("page"), null);
});

Deno.test("team-invites-list: an absent collection reads as empty, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  assertEquals(await action.execute!({}, ctx), []);
});

Deno.test("team-invites-list: it can be narrowed to one invitee", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { team_invites: [] } }]);
  await action.execute!({ emailAddress: "ada@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("email_address"), "ada@example.com");
});
