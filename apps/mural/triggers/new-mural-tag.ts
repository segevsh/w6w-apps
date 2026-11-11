import { boundedList } from "../lib/triggers.ts";
import tagList from "../actions/tag-list.ts";

export default boundedList({
  key: "new-mural-tag",
  title: "New Mural Tag",
  description: "The run gets each tag newly created on one mural.",
  action: tagList as never,
  params: [{
    key: "muralId",
    label: "Mural ID",
    type: "string",
    required: true,
    hint: "The mural to watch, e.g. from List Murals.",
  }],
  input: (p) => ({ muralId: p.muralId }),
  paged: false,
  output: [{ key: "id", type: "string", label: "Tag ID" }, {
    key: "text",
    type: "string",
    label: "Text",
  }, { key: "backgroundColor", type: "string", label: "Colour" }],
  sample: { id: "t-1", text: "Urgent", backgroundColor: "#FF0000FF" },
});
