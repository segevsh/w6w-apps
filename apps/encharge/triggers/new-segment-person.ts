import { pollFromListAction } from "../../_shared/poll/mod.ts";
import segmentPeopleList from "../actions/segment-people-list.ts";

export default pollFromListAction<{ segmentId?: number }>({
  key: "new-segment-person",
  title: "New Segment Person",
  description: "The run gets each newly added person in the selected segment.",
  action: segmentPeopleList as never,
  input: (params) => ({
    segmentId: params.segmentId,
    limit: 100,
    offset: 0,
    sort: "createdAt",
    order: "desc",
  }),
  params: [{ key: "segmentId", label: "Segment ID", type: "number", required: true }],
  items: (result) =>
    Array.isArray((result as { people?: unknown[] }).people)
      ? (result as { people: unknown[] }).people
      : [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "number", label: "Person ID" }],
  sample: { id: 101 },
  maxPages: 1,
});
