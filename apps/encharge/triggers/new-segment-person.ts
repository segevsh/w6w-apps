import { pollFromListAction } from "../../_shared/poll/mod.ts";
import segmentPeopleList from "../actions/segment-people-list.ts";

export default pollFromListAction<{ segmentId?: number; sortField?: string }>({
  key: "new-segment-person",
  title: "New Segment Person",
  description: "The run gets each person newly listed in the selected segment.",
  action: segmentPeopleList as never,
  input: (params) => ({
    segmentId: params.segmentId,
    limit: 100,
    offset: 0,
    sort: params.sortField,
    order: "desc",
  }),
  params: [
    { key: "segmentId", label: "Segment ID", type: "number", required: true },
    {
      key: "sortField",
      label: "Creation-time person field",
      type: "string",
      required: true,
      hint: "The person field that holds when a person was created, e.g. `createdAt`.",
    },
  ],
  items: (result) =>
    Array.isArray((result as { people?: unknown[] }).people)
      ? (result as { people: unknown[] }).people
      : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "email", type: "string", label: "Email" },
  ],
  sample: { id: "5f3c1a", email: "ada@example.com" },
  maxPages: 1,
});
