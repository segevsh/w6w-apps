import { assertEquals } from "@std/assert";
import { mockActiveCampaignCtx } from "../_helpers.ts";
import action from "../../actions/add-contact-to-automation.ts";

Deno.test("add-contact-to-automation: POSTs /contactAutomations with contact + automation ids", async () => {
  const body = { contactAutomation: { id: "1", contact: "42", automation: "6" }, contacts: [] };
  const { ctx, calls } = mockActiveCampaignCtx([{ body }]);
  const result = await action.execute({ contactId: "42", automationId: "6" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/3/contactAutomations");
  assertEquals(
    JSON.parse(calls[0].body!),
    { contactAutomation: { contact: "42", automation: "6" } },
  );
  assertEquals(result, body);
});
