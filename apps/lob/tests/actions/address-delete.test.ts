import { assertEquals, assertRejects } from "@std/assert";
import addressDelete from "../../actions/address-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("address-delete: sends DELETE to the resource and returns Lob's confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "adr_abc", deleted: true } }]);
  const out = await addressDelete.execute({ addressId: "adr_abc" }, ctx) as {
    id: string;
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/addresses/adr_abc");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "adr_abc", deleted: true });
});

Deno.test("address-delete: is declared idempotent", () => {
  assertEquals(addressDelete.idempotent, true);
});

Deno.test("address-delete: a refused delete surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("not_deletable", "cannot be deleted", 422),
  }]);
  await assertRejects(
    async () => await addressDelete.execute({ addressId: "adr_abc" }, ctx),
    Error,
    "not_deletable",
  );
});
