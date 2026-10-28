import type { ActionDefinition } from "@w6w/types";
import { TrelloClient } from "../lib/client.ts";

interface Input {
  idBoard: string;
  name: string;
  color: string;
}

const labelCreate: ActionDefinition<Input> = {
  key: "label-create",
  type: "perform",
  resource: "label",
  title: "Create Label",
  description: "Create a label on a board.",
  idempotent: false,
  params: [
    { key: "idBoard", label: "Board ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "color",
      label: "Colour",
      type: "select",
      required: true,
      default: "green",
      options: [
        { value: "green", label: "Green" },
        { value: "yellow", label: "Yellow" },
        { value: "orange", label: "Orange" },
        { value: "red", label: "Red" },
        { value: "purple", label: "Purple" },
        { value: "blue", label: "Blue" },
        { value: "sky", label: "Sky" },
        { value: "lime", label: "Lime" },
        { value: "pink", label: "Pink" },
        { value: "black", label: "Black" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Label ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Colour" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request("/labels", {
      method: "POST",
      query: { idBoard: input.idBoard, name: input.name, color: input.color },
    });
  },
};

export default labelCreate;
