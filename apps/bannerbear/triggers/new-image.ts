import { pollFromListAction } from "../../_shared/poll/mod.ts";
import imageList from "../actions/image-list.ts";

export default pollFromListAction({
  key: "new-image",
  title: "New Image",
  description: "The run gets each newly requested image render.",
  action: imageList,
  input: () => ({ page: 1 }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { uid?: unknown }).uid ?? ""),
  output: [{ key: "uid", type: "string", label: "Image UID" }],
  sample: { uid: "img_001" },
  maxPages: 1,
});
