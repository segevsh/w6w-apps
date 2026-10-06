import type { ActionDefinition } from "@w6w/types";
import { ServiceTitanClient } from "../lib/client.ts";

/** `POST /jpm/v2/tenant/{tenant}/jobs/{id}/notes` — requires `text`. */
interface Input {
  id: number;
  text: string;
  pinToTop?: boolean;
}

const jobNoteCreate: ActionDefinition<Input> = {
  key: "job-note-create",
  type: "perform",
  resource: "job",
  title: "Add a Job Note",
  description: "Add a note to a job.",
  idempotent: false,
  params: [
    { key: "id", label: "Job ID", type: "number", required: true },
    { key: "text", label: "Note", type: "text", required: true },
    { key: "pinToTop", label: "Pin to top", type: "boolean", default: false },
  ],
  output: [
    { key: "text", type: "string", label: "Note" },
    { key: "isPinned", type: "boolean", label: "Pinned" },
    { key: "createdById", type: "number", label: "Created by" },
    { key: "createdOn", type: "string", label: "Created on" },
  ],

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request(
      "jpm",
      `/jobs/${encodeURIComponent(String(input.id))}/notes`,
      {
        method: "POST",
        body: { text: input.text, ...(input.pinToTop ? { pinToTop: true } : {}) },
      },
    );
  },
};

export default jobNoteCreate;
