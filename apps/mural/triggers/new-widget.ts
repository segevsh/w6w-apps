import { boundedList } from "../lib/triggers.ts";
import widgetList from "../actions/widget-list.ts";

export default boundedList({
  key: "new-widget",
  title: "New Widget",
  description: "The run gets each widget (sticky note, shape, text, ...) newly added to one mural.",
  action: widgetList as never,
  params: [{
    key: "muralId",
    label: "Mural ID",
    type: "string",
    required: true,
    hint: "The mural to watch, e.g. from List Murals.",
  }],
  input: (p) => ({ muralId: p.muralId }),
  output: [{ key: "id", type: "string", label: "Widget ID" }, {
    key: "type",
    type: "string",
    label: "Widget type",
  }, { key: "text", type: "string", label: "Text" }],
  sample: { id: "w-1", type: "sticky note", text: "Ship it" },
});
