import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/voice-list.ts";

export default pollFromListAction({
  key: "new-voice",
  title: "New Voice",
  description: "The run gets each newly created voice available to the account.",
  action,
  input: (params) => ({
    ...params,
    pageSize: 100,
    sort: "created_at_unix",
    sortDirection: "desc",
  }),
  items: (result) => (result as { voices?: unknown[] }).voices ?? [],
  idOf: (item) => String((item as { voice_id: string }).voice_id),
  params: action.params,
  output: [{ key: "voice_id", type: "string", label: "Voice ID" }],
  sample: { voice_id: "voice_123", name: "Narrator", created_at_unix: 1794182400 },
  maxPages: 1,
});
