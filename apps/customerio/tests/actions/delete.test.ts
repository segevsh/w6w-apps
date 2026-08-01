import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete.ts";

Deno.test("delete: DELETEs /customers/:id with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!({ personId: "u1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/customers/u1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(result, { success: true });
});

Deno.test("delete: rejects a blank personId", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ personId: "" }, ctx),
    Error,
    "`personId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("delete: uses the eu host when the connection's region is eu", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute!({ personId: "u1" }, ctx);
  assertEquals(calls[0].url, "https://track-eu.customer.io/api/v1/customers/u1");
});
