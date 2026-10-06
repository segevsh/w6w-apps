import { assertEquals } from "@std/assert";
import { mockTalentLmsCtx } from "../_helpers.ts";
import action from "../../actions/branch-add-user.ts";

Deno.test("branch-add-user: GET addusertobranch and returns the vendor payload", async () => {
  const { ctx, calls } = mockTalentLmsCtx([{ body: { ok: "yes" } }]);
  const out = await action.execute({ "userId": 7, "branchId": 2 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.talentlms.com/api/v1/addusertobranch/user_id:7,branch_id:2",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: "yes" });
});

Deno.test("branch-add-user: declares idempotent honestly", () => {
  assertEquals(action.idempotent, true);
});
