import { pollFromListAction } from "../../_shared/poll/mod.ts";
import emailList from "../actions/email-list.ts";

/** Resend documents the email list as newest first and its action requests one bounded page. */
export default pollFromListAction({
  key: "new-email",
  title: "New Email",
  description: "The run gets each newly sent email.",
  action: emailList,
  input: () => ({ limit: 100, returnAll: false }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Email ID" }],
  sample: { id: "email_123", to: ["customer@example.com"] },
  maxPages: 1,
});
