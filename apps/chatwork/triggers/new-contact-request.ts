import { snapshotTrigger } from "../lib/triggers.ts";
import incomingRequestList from "../actions/incoming-request-list.ts";

export default snapshotTrigger({
  key: "new-contact-request",
  title: "New Contact Request",
  description: "The run gets each new pending contact request sent to the connected account.",
  action: incomingRequestList,
  input: () => ({}),
  idKey: "request_id",
  output: [
    { key: "request_id", type: "number", label: "Request ID" },
    { key: "account_id", type: "number", label: "Requester's account ID" },
    { key: "message", type: "string", label: "Message included with the request" },
    { key: "name", type: "string", label: "Requester's display name" },
    { key: "chatwork_id", type: "string", label: "Requester's Chatwork ID" },
    { key: "organization_name", type: "string", label: "Requester's organization name" },
    { key: "department", type: "string", label: "Requester's department" },
  ],
  sample: {
    request_id: 77,
    account_id: 1234,
    message: "Hello, let us connect",
    name: "Ada Lovelace",
    chatwork_id: "ada",
    organization_name: "Analytical Engines",
    department: "Research",
  },
});
