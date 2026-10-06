import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-email",
  resource: "email",
  title: "Get Email",
  description:
    "Read one sent email with its recipient and activity events (GET /v1/email/{id}). `text` and `html` are null when content tracking is off for the domain. Needs an `email_full`, `activity_read` or `activity_full` token.",
  path: (id) => `/email/${seg(id)}`,
  idKey: "emailId",
  idLabel: "Email ID",
  idHint: "The `id` of a row from List Emails (not the message id from Send Email).",
});
