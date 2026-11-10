import { pollFromListAction } from "../../_shared/poll/mod.ts";
import segmentSubscribersList from "../actions/segment-subscribers-list.ts";

/**
 * `GET /v2/segments/{id}/subscribers` takes the shared `order` / `direction` pagination parameters
 * (https://api.sender.net/pagination/); subscribers carry `created`
 * (https://api.sender.net/segments/subscribers/). Newest-created first.
 */
export default pollFromListAction({
  key: "new-segment-subscriber",
  title: "New Subscriber in Segment",
  description:
    "The run gets each newly created subscriber that matches the chosen segment (a subscriber who starts matching later is not reported).",
  action: segmentSubscribersList,
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      required: true,
      hint: "The id of the segment to watch.",
    },
  ],
  input: (params: { segmentId?: string }) => ({
    id: params.segmentId,
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
