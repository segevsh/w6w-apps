import { assertEquals } from "@std/assert";
import action from "../../actions/list-contacts.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-contacts: GETs the contacts of a list", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "draw": 0,
      "recordsTotal": 1,
      "recordsFiltered": 1,
      "data": [{ "id": 1, "name": "John Doe" }],
    },
  }]);
  const out = await action.execute!({ "id": 18 } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/contacts/get/18");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {
    "draw": 0,
    "recordsTotal": 1,
    "recordsFiltered": 1,
    "data": [{ "id": 1, "name": "John Doe" }],
  });
});
