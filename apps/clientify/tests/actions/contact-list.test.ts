import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GET /v1/contacts/", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 1, next: null, previous: null, results: [{ id: 7, first_name: "Ada" }] },
  }]);
  const result = await contactList.execute({
    query: "Marcos",
    contactSource: "Facebook",
    page: 2,
    filters: { "created[gt]": "2024/01/01" },
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/contacts/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {
    "created[gt]": "2024/01/01",
    query: "Marcos",
    contact_source: "Facebook",
    page: "2",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    count: 1,
    next: null,
    previous: null,
    results: [{ id: 7, first_name: "Ada" }],
  });
});

Deno.test("contact-list: declares type search", () => {
  assertEquals(contactList.type, "search");
});

Deno.test("contact-list: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await contactList.execute({
      query: "Marcos",
      contactSource: "Facebook",
      page: 2,
      filters: { "created[gt]": "2024/01/01" },
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
