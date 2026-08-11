import { assert, assertEquals } from "@std/assert";
import action from "../../actions/member-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-get: GETs the member by id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "m-1" }) }]);
  const out = await action.execute({ memberId: "m-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/members/m-1");
  assertEquals(out.data, { id: "m-1" });
});

/**
 * `/v2/me`, `/v2/users/me` and `/v2/account` all answer 404 route.notFound
 * (measured 2026-08-11), so this endpoint cannot substitute for a whoami and
 * must not be described as one.
 */
Deno.test("member-get: says outright that it is not a whoami", () => {
  assert(action.description!.toLowerCase().includes("not a whoami"), action.description!);
  assertEquals(action.params?.find((p) => p.key === "memberId")?.required, true);
});
