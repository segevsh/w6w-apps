import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/segment-get-contacts.ts";

test("segment-get-contacts: GETs getsegmentcontacts and returns segment_contacts as contacts", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        status: "success",
        code: "0",
        segment_contacts: [{ contact_email: "user@thandora.com" }],
      },
    },
  ]);
  const out = await action.execute({ cvid: "303000014567003" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/getsegmentcontacts");
  assertEquals(url.searchParams.get("cvid"), "303000014567003");
  assertEquals(out, { contacts: [{ contact_email: "user@thandora.com" }] });
});
