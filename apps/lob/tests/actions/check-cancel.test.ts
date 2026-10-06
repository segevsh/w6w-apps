import { assertEquals, assertRejects } from "@std/assert";
import checkCancel from "../../actions/check-cancel.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("check-cancel: sends DELETE to the resource and returns Lob's confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "chk_abc", deleted: true } }]);
  const out = await checkCancel.execute({ checkId: "chk_abc" }, ctx) as {
    id: string;
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/checks/chk_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "chk_abc", deleted: true });
});

Deno.test("check-cancel: is declared idempotent", () => {
  assertEquals(checkCancel.idempotent, true);
});

Deno.test("check-cancel: a refused delete surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("not_deletable", "cannot be deleted", 422),
  }]);
  await assertRejects(
    async () => await checkCancel.execute({ checkId: "chk_abc" }, ctx),
    Error,
    "not_deletable",
  );
});
