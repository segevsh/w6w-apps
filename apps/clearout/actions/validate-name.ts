import type { ActionDefinition } from "@w6w/types";
import { ClearoutClient, compact } from "../lib/client.ts";

interface Input {
  name: string;
  gibberishThreshold?: string;
  timeout?: number;
}

/** `POST /name/validate` — profanity and gibberish detection for a name string. */
const validateName: ActionDefinition<Input> = {
  key: "validate-name",
  type: "read",
  resource: "name",
  title: "Validate Name",
  description: "Check whether a name string is profane or gibberish.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "gibberishThreshold",
      label: "Gibberish sensitivity",
      type: "select",
      default: "high",
      options: ["off", "medium", "high"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      validation: { min: 1000, max: 10000, integer: true },
      hint: "1000-10000 ms, vendor default 8000.",
    },
  ],
  output: [
    { key: "inputName", type: "string", label: "Name as submitted" },
    { key: "status", type: "string", label: "Validation status" },
    { key: "profanity", type: "boolean", label: "Contains profanity" },
    { key: "gibberish", type: "boolean", label: "Is gibberish" },
    { key: "timeTaken", type: "number", label: "Time taken (ms)" },
  ],

  async execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    if (!name) throw new Error("name is required");
    const { data } = await new ClearoutClient(ctx).request("/name/validate", {
      body: compact({
        name,
        settings: input.gibberishThreshold
          ? { gibberish_threshold: input.gibberishThreshold }
          : undefined,
        timeout: input.timeout,
      }),
    });
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      inputName: d.input_name,
      status: d.status,
      profanity: d.profanity,
      gibberish: d.gibberish,
      timeTaken: d.time_taken,
    };
  },
};

export default validateName;
