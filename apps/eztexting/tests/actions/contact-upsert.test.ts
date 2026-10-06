import { assertEquals } from "@std/assert";
import contactUpsert from "../../actions/contact-upsert.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("contact-upsert: calls POST /contacts and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c9" } }]);
  const result = await contactUpsert.execute(
    {
      "phoneNumber": "2125551234",
      "firstName": "Ada",
      "groupIdsAdd": ["3"],
      "values": '{"pet":"cat"}',
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts`);
  assertEquals(bodyOf(calls[0]), {
    "phoneNumber": "2125551234",
    "firstName": "Ada",
    "values": { "pet": "cat" },
    "groupIdsAdd": ["3"],
  });
  assertEquals(result, { "id": "c9" });
});

Deno.test("contact-upsert: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c9" } }]);
  await contactUpsert.execute(
    {
      "phoneNumber": "2125551234",
      "firstName": "Ada",
      "groupIdsAdd": ["3"],
      "values": '{"pet":"cat"}',
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});
