import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/alert-contact-list.ts";

Deno.test("alert-contact-list: POSTs /getAlertContacts and unwraps alert_contacts", async () => {
  const { ctx, calls } = mockCtx([{
    body: { stat: "ok", alert_contacts: [{ id: "236", friendly_name: "Email", type: 2 }] },
  }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/getAlertContacts");
  assertEquals(out.alertContacts.length, 1);
});

Deno.test("alert-contact-list: passes dash-separated ids through as alert_contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", alert_contacts: [] } }]);
  await action.execute({ alertContacts: "236-1782-4790" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("alert_contacts"), "236-1782-4790");
});
