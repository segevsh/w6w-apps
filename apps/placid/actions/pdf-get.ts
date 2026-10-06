import type { ActionDefinition } from "@w6w/types";
import { PlacidClient, required } from "../lib/client.ts";
import { renderOutput } from "../lib/params.ts";

interface Input {
  id: string | number;
}

/** `GET /pdfs/{id}` — the render record; `pdf_url` is null until `status` is `finished`. */
const action: ActionDefinition<Input, unknown> = {
  key: "pdf-get",
  type: "read",
  resource: "pdf",
  title: "Get PDF",
  description: "Retrieve a pdf render by id to check its status and get the finished file URL.",
  params: [
    { key: "id", label: "PDF ID", type: "string", required: true },
  ],
  output: [
    ...renderOutput("pdf_url"),
  ],

  async execute(input, ctx) {
    const id = required(input.id, "id");
    return await new PlacidClient(ctx).json(`/pdfs/${encodeURIComponent(id)}`);
  },
};

export default action;
