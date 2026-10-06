import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/position-set-state.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("position-set-state: PUTs the state and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ companyId: "c1", positionId: "p1", state: "published" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1/state");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { state: "published" });
  assertEquals(out, { ok: true, state: "published" });
});

Deno.test("position-set-state: the active-position limit 400 is an error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: { type: "limit", message: "max" } } }]);
  await assertRejects(
    async () =>
      await action.execute!({ companyId: "c1", positionId: "p1", state: "published" }, ctx),
    Error,
    "HTTP 400",
  );
});
