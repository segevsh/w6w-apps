import { assertEquals, assertRejects } from "@std/assert";
import accessRevoke from "../../actions/access-revoke.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("access-revoke: sends DELETE /customers/${seg(input.customerId)}/accesses/${seg(input.accessId)} and reports ok on an empty 200", async () => {
  const { ctx, calls } = mockCtx([{ body: "" }]);
  const out = await accessRevoke.execute({ "customerId": "5", "accessId": "9" } as never, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/5/accesses/9");
  assertEquals(out, { ok: true });
});

Deno.test("access-revoke: a 404 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  await assertRejects(
    () =>
      accessRevoke.execute({ "customerId": "5", "accessId": "9" } as never, ctx) as Promise<
        unknown
      >,
    Error,
    "Not Found",
  );
});
