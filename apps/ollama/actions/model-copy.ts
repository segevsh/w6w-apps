import type { ActionDefinition } from "@w6w/types";
import { OllamaClient, requiredString } from "../lib/client.ts";

/**
 * `POST /api/copy` — give an installed model a second name.
 *
 * The copy shares the original's layers, so it costs almost no disk. It is the
 * way to pin a stable alias (`summariser`) to whichever model is current, or to
 * keep a copy before overwriting a name with a pull. An existing destination is
 * overwritten.
 */
const action: ActionDefinition = {
  key: "model-copy",
  type: "perform",
  resource: "model",
  title: "Copy a model",
  description:
    "Create a new name for an installed model on your Ollama server. The copy shares the " +
    "original's data on disk, so it is nearly free. An existing destination name is overwritten.",
  idempotent: true,
  params: [
    {
      key: "source",
      label: "Source Model",
      type: "string",
      required: true,
      default: "",
      placeholder: "llama3.2:3b",
    },
    {
      key: "destination",
      label: "New Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "my-llama",
      hint: "An existing model with this name is replaced.",
    },
  ],
  output: [
    { key: "copied", type: "boolean", label: "True when the server accepted the copy" },
    { key: "source", type: "string", label: "The model copied from" },
    { key: "destination", type: "string", label: "The new name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const source = requiredString(p.source, "source");
    const destination = requiredString(p.destination, "destination");
    await new OllamaClient(ctx).request("/api/copy", {
      method: "POST",
      body: { source, destination },
    });
    return { copied: true, source, destination };
  },
};

export default action;
