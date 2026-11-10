import emailList from "../actions/email-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each new Keap email record, newest first (`GET /rest/v2/emails`, `order_by=created_time desc`). Brief 9.1 (a). */
export default feedTrigger({
  key: "new-email",
  title: "New Email",
  description:
    "The run gets each new Keap email record, newest first (`GET /rest/v2/emails`, `order_by=created_time desc`).",
  action: emailList,
  list: "emails",
  orderBy: "created_time desc",
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "contact_id", type: "string", label: "Contact ID" },
    { key: "sent_time", type: "string", label: "Sent at" },
  ],
  sample: { id: "1", subject: "Welcome", contact_id: "9", sent_time: "2026-11-10T12:00:00.000Z" },
});
