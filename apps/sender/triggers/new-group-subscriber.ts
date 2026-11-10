import { pollFromListAction } from "../../_shared/poll/mod.ts";
import groupSubscribersList from "../actions/group-subscribers-list.ts";

/**
 * `GET /v2/groups/{id}/subscribers` takes the shared `order` / `direction` pagination parameters
 * (https://api.sender.net/pagination/); subscribers carry `created`
 * (https://api.sender.net/groups/subscribers/). Newest-created first.
 */
export default pollFromListAction({
  key: "new-group-subscriber",
  title: "New Subscriber in Group",
  description:
    "The run gets each newly created subscriber that belongs to the chosen group (a subscriber added to the group after it was created is not reported).",
  action: groupSubscribersList,
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      hint: "The id of the group to watch.",
    },
  ],
  input: (params: { groupId?: string }) => ({
    id: params.groupId,
    page: 1,
    limit: 100,
    order: "created",
    direction: "desc",
  }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "created", type: "string", label: "Created" },
  ],
  sample: {
    id: "subscriber-1",
    email: "ada@example.test",
    firstname: "Ada",
    lastname: "Lovelace",
    created: "2026-11-10 09:00:00",
  },
  maxPages: 1,
});
