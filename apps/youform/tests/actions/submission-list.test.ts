import { assertEquals, assertRejects } from "@std/assert";
import submissionList from "../../actions/submission-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("submission-list: sends the documented query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { current_page: 1, data: [] } } }]);
  await submissionList.execute({
    form: "kupgh0ef",
    is_complete: false,
    sort_by: "created_at",
    sort_by_order: "desc",
    per_page: 100,
    page: 3,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/forms/kupgh0ef/submissions");
  assertEquals(queryOf(calls[0].url), {
    is_complete: "0",
    sort_by: "created_at",
    sort_by_order: "desc",
    per_page: "100",
    page: "3",
  });
});

Deno.test("submission-list: is_complete is omitted when unset (free plans 400 on it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { data: [] } } }, {
    body: { data: { data: [] } },
  }]);
  await submissionList.execute({ form: "f" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  await submissionList.execute({ form: "f", is_complete: true }, ctx);
  assertEquals(queryOf(calls[1].url), { is_complete: "1" });
});

Deno.test("submission-list: a free-plan 400 is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Upgrade to use is_complete") }]);
  const err = await assertRejects(
    () => Promise.resolve(submissionList.execute({ form: "f", is_complete: false }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Upgrade"), true);
});
