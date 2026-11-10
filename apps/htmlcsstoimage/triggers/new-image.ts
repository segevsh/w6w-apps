import { pollFromListAction } from "../../_shared/poll/mod.ts";
import imageList from "../actions/image-list.ts";

export default pollFromListAction({
  key: "new-image",
  title: "New Image",
  description: "The run gets each newly created HTML/CSS to Image image.",
  action: imageList,
  input: () => ({ count: 50 }),
  items: (result) => (result as { images?: unknown[] }).images ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Image ID" }],
  sample: { id: "image-1", created_at: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
