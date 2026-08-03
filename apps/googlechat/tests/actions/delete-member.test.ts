import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-member.ts";

Deno.test("delete-member: DELETEs spaces/{space}/members/{member}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "spaces/A1/members/M1" } }]);
  await action.execute!({ space: "A1", member: "M1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/members/M1");
});

Deno.test("delete-member: an email alias keeps its @ so Google's routing still matches", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "A1", member: "person@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A1/members/person@example.com");
});

Deno.test("delete-member: a full membership resource name overrides the space field", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ space: "IGNORED", member: "spaces/A9/members/M9" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/A9/members/M9");
});

Deno.test("delete-member: returns Google's deleted Membership, not a sentinel", async () => {
  const body = { name: "spaces/A1/members/M1", state: "NOT_A_MEMBER" };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({ space: "A1", member: "M1" }, ctx), body);
});
