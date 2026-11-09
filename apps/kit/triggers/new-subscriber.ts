import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listSubscribers from "../actions/list-subscribers.ts";

interface Subscriber {
  id?: number | string;
  email_address?: string;
  created_at?: string;
  updated_at?: string;
}

const newSubscriber = pollFromListAction({
  key: "new-subscriber",
  title: "New Subscriber",
  description: "Poll Kit's subscriber list for recently updated subscribers.",
  action: listSubscribers,
  input: () => ({ perPage: 100, sortField: "updated_at", sortOrder: "desc" }),
  items: (result) => (result as { subscribers?: Subscriber[] }).subscribers ?? [],
  idOf: (item) => String((item as Subscriber).id),
  output: [
    { key: "id", type: "number", label: "Subscriber ID" },
    { key: "email_address", type: "string", label: "Email Address" },
    { key: "created_at", type: "string", label: "Created At" },
    { key: "updated_at", type: "string", label: "Updated At" },
  ],
  sample: {
    id: 42,
    email_address: "ada@example.com",
    created_at: "2026-11-09T12:00:00Z",
    updated_at: "2026-11-09T12:00:00Z",
  },
});

export default newSubscriber;
