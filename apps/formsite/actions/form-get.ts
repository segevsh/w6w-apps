import type { ActionDefinition } from "@w6w/types";
import { FormsiteClient } from "../lib/client.ts";
import { formDir } from "../lib/params.ts";

interface Input {
  formDir: string;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch one form: its name, open/closed state, share link and result count.",
  params: [formDir],
  output: [{ key: "form", type: "object", label: "Form" }],

  async execute(input, ctx) {
    const res = await new FormsiteClient(ctx).request<{ forms?: unknown[] }>(
      `/forms/${encodeURIComponent(input.formDir)}`,
    );
    return { form: res.forms?.[0] ?? null };
  },
};

export default formGet;
