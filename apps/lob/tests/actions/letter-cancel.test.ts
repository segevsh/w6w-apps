import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import letterCancel from "../../actions/letter-cancel.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("letter-cancel: sends DELETE to the resource and returns Lob's confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ltr_abc", deleted: true } }]);
  const out = await letterCancel.execute({ letterId: "ltr_abc" }, ctx) as {
    id: string;
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/letters/ltr_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "ltr_abc", deleted: true });
});

test("letter-cancel: is declared idempotent", () => {
  assertEquals(letterCancel.idempotent, true);
});

test("letter-cancel: a refused delete surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("not_deletable", "cannot be deleted", 422),
  }]);
  await assertRejects(
    async () => await letterCancel.execute({ letterId: "ltr_abc" }, ctx),
    Error,
    "not_deletable",
  );
});
