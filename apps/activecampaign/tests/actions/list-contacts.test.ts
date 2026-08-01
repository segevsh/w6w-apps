import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/list-contacts.ts";

Deno.test("list-contacts: GETs /contacts with filters mapped to AC's query names", async () => {
  const body = { contacts: [], meta: { total: "0" } };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute(
    {
      limit: 10,
      offset: 5,
      email: "a@b.com",
      search: "acme",
      listId: "3",
      tagId: "7",
      status: "1",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/3/contacts");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("offset"), "5");
  assertEquals(url.searchParams.get("email"), "a@b.com");
  assertEquals(url.searchParams.get("search"), "acme");
  assertEquals(url.searchParams.get("listid"), "3");
  assertEquals(url.searchParams.get("tagid"), "7");
  assertEquals(url.searchParams.get("status"), "1");
  assertEquals(result, body);
});

Deno.test("list-contacts: omits unset filters", async () => {
  const { ctx, calls } = mockActiveCampaignCtx([{ body: { contacts: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("email"), false);
  assertEquals(url.searchParams.has("listid"), false);
});
