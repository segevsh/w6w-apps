import { assertEquals, assertRejects } from "@std/assert";
import postcardCancel from "../../actions/postcard-cancel.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("postcard-cancel: sends DELETE to the resource and returns Lob's confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "psc_abc", deleted: true } }]);
  const out = await postcardCancel.execute({ postcardId: "psc_abc" }, ctx) as {
    id: string;
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/postcards/psc_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "psc_abc", deleted: true });
});

Deno.test("postcard-cancel: is declared idempotent", () => {
  assertEquals(postcardCancel.idempotent, true);
});

Deno.test("postcard-cancel: a refused delete surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("not_deletable", "cannot be deleted", 422),
  }]);
  await assertRejects(
    async () => await postcardCancel.execute({ postcardId: "psc_abc" }, ctx),
    Error,
    "not_deletable",
  );
});
