import { assertEquals } from "@std/assert";
import messageDetailsGet from "../../actions/message-details-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("message-details-get: calls GET /message-details/42 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { recipientsCount: 2, credits: 2, fromNumber: "8005550100" },
  }]);
  const result = await messageDetailsGet.execute({ "id": "42" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/message-details/42`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "recipientsCount": 2, "credits": 2, "fromNumber": "8005550100" });
});

Deno.test("message-details-get: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{
    body: { recipientsCount: 2, credits: 2, fromNumber: "8005550100" },
  }]);
  await messageDetailsGet.execute({ "id": "42" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
