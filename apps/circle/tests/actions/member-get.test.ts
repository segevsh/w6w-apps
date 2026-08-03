import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import action from "../../actions/member-get.ts";

Deno.test("member-get: GETs /community_members/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "Alice" } }]);
  const out = await action.execute({ memberId: 42 }, ctx);
  assertEquals(calls[0].url, `${API}/community_members/42`);
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 42, name: "Alice" });
});

Deno.test("member-get: the response is passed through unwrapped", async () => {
  // v2 returns the member at the top level — there is no envelope to unwrap,
  // and inventing one would break every downstream expression.
  const { ctx } = mockCtx([{ body: { id: 1, email: "a@b.c" } }]);
  assertEquals(await action.execute({ memberId: 1 }, ctx), { id: 1, email: "a@b.c" });
});

Deno.test("member-get: the member id is required and integer-validated", () => {
  const p = action.params!.find((p) => p.key === "memberId")!;
  assertEquals(p.required, true);
  assertEquals(p.validation?.integer, true);
});
