import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/submission-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("submission-list: GET /api/v3/submissions with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }] }]);
  const out = await action.execute(
    { "formId": 346127, "status": "all", "startDate": "2024-01-30" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/submissions");
  assertEquals(queryOf(calls[0].url), {
    "form_id": "346127",
    "status": "all",
    "start_date": "2024-01-30",
  });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 1 }]);

  await assertRejects(
    async () => await action.execute({}, mockCtx().ctx),
    Error,
    "at least one of",
  );
  await assertRejects(
    async () => await action.execute({ userId: 1, userEmail: "a@b.co" }, mockCtx().ctx),
    Error,
    "cannot be combined",
  );
  const byEmail = mockCtx([{ body: [] }]);
  await action.execute({ userEmail: "a@b.co" }, byEmail.ctx);
  assertEquals(queryOf(byEmail.calls[0].url), { user_email: "a@b.co" });
});
