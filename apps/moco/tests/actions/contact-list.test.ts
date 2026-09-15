import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /contacts/people with filters and returns pagination", async () => {
  const { ctx, calls } = mockMocoCtx([{
    body: [{ id: 1, firstname: "Max" }],
    headers: {
      "content-type": "application/json",
      "x-page": "1",
      "x-per-page": "100",
      "x-total": "1",
    },
  }]);
  const out = await action.execute({ term: "Max", tags: "VIP,Enterprise", page: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/contacts/people");
  assertEquals(url.searchParams.get("term"), "Max");
  assertEquals(url.searchParams.get("tags"), "VIP,Enterprise");
  assertEquals(out, {
    contacts: [{ id: 1, firstname: "Max" }],
    page: 1,
    perPage: 100,
    total: 1,
  });
});
