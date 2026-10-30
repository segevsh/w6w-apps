import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

test("contact-list: GETs getlistsubscribers and returns list_of_details as contacts", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        status: "success",
        code: "0",
        list_of_details: [{ contact_email: "a@b.com" }],
      },
    },
  ]);
  const out = await action.execute({ listKey: "abc", status: "active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/getlistsubscribers");
  assertEquals(url.searchParams.get("listkey"), "abc");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(out, { contacts: [{ contact_email: "a@b.com" }] });
});
