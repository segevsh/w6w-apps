import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import selfMailerDelete from "../../actions/self-mailer-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("self-mailer-delete: sends DELETE to the resource and returns Lob's confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sfm_abc", deleted: true } }]);
  const out = await selfMailerDelete.execute({ selfMailerId: "sfm_abc" }, ctx) as {
    id: string;
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/self_mailers/sfm_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "sfm_abc", deleted: true });
});

test("self-mailer-delete: is declared idempotent", () => {
  assertEquals(selfMailerDelete.idempotent, true);
});

test("self-mailer-delete: a refused delete surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("not_deletable", "cannot be deleted", 422),
  }]);
  await assertRejects(
    async () => await selfMailerDelete.execute({ selfMailerId: "sfm_abc" }, ctx),
    Error,
    "not_deletable",
  );
});
