import { assertEquals, assertRejects } from "@std/assert";
import contactBatchUpsert from "../../actions/contact-batch-upsert.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("contact-batch-upsert: calls POST /contacts/batch and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await contactBatchUpsert.execute(
    {
      "contacts": [{ "phoneNumber": "2125551234", "firstName": "Ada" }],
      "groupIdsAdd": "3",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/batch`);
  assertEquals(bodyOf(calls[0]), {
    "contacts": [{ "phoneNumber": "2125551234", "firstName": "Ada" }],
    "groupIdsAdd": ["3"],
  });
  assertEquals(result, { "count": 1, "status": 200 });
});

Deno.test("contact-batch-upsert: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await contactBatchUpsert.execute(
    {
      "contacts": [{ "phoneNumber": "2125551234", "firstName": "Ada" }],
      "groupIdsAdd": "3",
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("contact-batch-upsert: an empty batch is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactBatchUpsert.execute({ contacts: [] }, ctx),
    Error,
    "non-empty",
  );
  assertEquals(calls.length, 0);
});
