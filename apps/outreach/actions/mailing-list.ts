import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "mailing-list",
  title: "List Mailings",
  noun: "Mailing",
  type: "mailing",
  path: "mailings",
  description:
    "List mailings (emails sent or scheduled through Outreach) with their delivery, open, click and reply state.",
});
