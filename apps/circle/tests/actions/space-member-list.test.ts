import { assert, assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/space-member-list.ts";

Deno.test("space-member-list: GETs /space_members with the required space id", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({ spaceId: 3 }, ctx);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/space_members");
  assertEquals(queryOf(calls[0]), { space_id: ["3"] });
});

Deno.test("space-member-list: forwards status and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ spaceId: 3, status: "active", page: 2, perPage: 10 }, ctx);
  assertEquals(queryOf(calls[0]), {
    space_id: ["3"],
    status: ["active"],
    page: ["2"],
    per_page: ["10"],
  });
});

Deno.test("space-member-list: space_id is required — there is no community-wide membership list", () => {
  assertEquals(action.params!.find((p) => p.key === "spaceId")!.required, true);
});

/**
 * Two identically-spelled `status` parameters with OPPOSITE defaults — `all`
 * here, `active` on `member-list` — is exactly how a headcount ends up
 * irreconcilable. Both hints must name their own default.
 */
Deno.test("space-member-list: the status hint names this route's default, which is `all`", () => {
  const hint = action.params!.find((p) => p.key === "status")!.hint!;
  assert(hint.includes("all"));
  assert(hint.includes("member-list"));
});
