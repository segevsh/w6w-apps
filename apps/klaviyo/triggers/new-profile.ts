import { pollFromListAction } from "../../_shared/poll/mod.ts";
import profiles from "../actions/get-profiles.ts";

export default pollFromListAction({
  key: "new-profile",
  title: "New Profile",
  description: "The run gets each newly created profile.",
  action: profiles,
  input: () => ({ sort: "-created", pageSize: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Profile ID" }],
  sample: { id: "01HXYZPROFILE" },
  maxPages: 1,
});
