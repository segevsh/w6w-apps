import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-member.ts";

test("get-member: GETs /members/{id} (UUID) with default include", async () => {
  const body = { data: { id: "03ca69c3-ebea-4b9a-8fac-e4a837873254", type: "member" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ memberId: "03ca69c3-ebea-4b9a-8fac-e4a837873254" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/members/03ca69c3-ebea-4b9a-8fac-e4a837873254");
  assertEquals(url.searchParams.get("include"), "currently_entitled_tiers");
  assertEquals(out, body);
});
