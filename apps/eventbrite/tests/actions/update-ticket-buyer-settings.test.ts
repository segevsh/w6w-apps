import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-ticket-buyer-settings.ts";

Deno.test("update-ticket-buyer-settings: POST /events/e1/ticket_buyer_settings/", async () => {
  const resp = { "event_id": "e1" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "eventId": "e1",
    "confirmationMessage": "<b>Hi</b>",
    "refundRequestEnabled": true,
    "surveyRespondent": "attendee",
    "surveyTicketClasses": ["1", "2"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/ticket_buyer_settings/");
  assertEquals(JSON.parse(calls[0].body!), {
    "ticket_buyer_settings": {
      "confirmation_message": { "html": "<b>Hi</b>" },
      "refund_request_enabled": true,
      "survey_respondent": "attendee",
      "survey_ticket_classes": ["1", "2"],
    },
  });
  assertEquals(result, resp);
});

Deno.test("update-ticket-buyer-settings: sends only supplied fields and deep-merges extra", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ "eventId": "e1", "extra": { "zzz": { "a": 1 } } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { "ticket_buyer_settings": { "zzz": { "a": 1 } } });
});
