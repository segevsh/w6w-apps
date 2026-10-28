import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/lead-convert.ts";

Deno.test("lead-convert: POSTs to /Leads/{id}/actions/convert with a Deals block by default", async () => {
  const { ctx, calls } = mockZohoCtx([
    {
      body: {
        data: [{
          code: "SUCCESS",
          status: "success",
          details: { Contacts: { id: "c1" }, Accounts: { id: "a1" }, Deals: { id: "d1" } },
        }],
      },
    },
  ]);
  const out = await action.execute({
    recordId: "1",
    createDeal: true,
    dealName: "Acme deal",
    overwrite: false,
    notifyLeadOwner: false,
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Leads/1/actions/convert");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data[0].Deals.Deal_Name, "Acme deal");
  assertEquals(out.details, {
    Contacts: { id: "c1" },
    Accounts: { id: "a1" },
    Deals: { id: "d1" },
  });
});

Deno.test("lead-convert: omits Deals when createDeal is off, merges into an existing Contact", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: {} }] } },
  ]);
  await action.execute({
    recordId: "1",
    createDeal: false,
    contactId: "existing-contact",
    overwrite: true,
    notifyLeadOwner: false,
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data[0].Deals, undefined);
  assertEquals(body.data[0].Contacts, { id: "existing-contact" });
  assertEquals(body.data[0].overwrite, true);
});

Deno.test("lead-convert: not idempotent — a converted Lead cannot be converted twice", () => {
  assertEquals(action.idempotent, false);
});
