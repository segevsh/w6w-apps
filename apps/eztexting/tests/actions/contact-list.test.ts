import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { API_ROOT, mockCtx, page, queryOf } from "../_helpers.ts";

Deno.test("contact-list: calls GET /contacts and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ phoneNumber: "2125551234" }]) }]);
  const result = await contactList.execute(
    {
      "phoneNumber": "212",
      "firstName": "Ad",
      "source": "API",
      "optOut": false,
      "size": "10",
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts`);
  assertEquals(queryOf(calls[0].url), {
    "size": "10",
    "filters[phoneNumber][like]": "212",
    "filters[firstName][like]": "Ad",
    "filters[source][eq]": "API",
    "filters[optOut][eq]": "false",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    "content": [{ "phoneNumber": "2125551234" }],
    "totalPages": 1,
    "totalElements": 1,
    "numberOfElements": 1,
  });
});

Deno.test("contact-list: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ phoneNumber: "2125551234" }]) }]);
  await contactList.execute(
    {
      "phoneNumber": "212",
      "firstName": "Ad",
      "source": "API",
      "optOut": false,
      "size": "10",
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});
