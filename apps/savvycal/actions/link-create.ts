import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  scopeSlug?: string;
  name: string;
  description?: string;
  privateName?: string;
  type?: string;
}

const linkCreate: ActionDefinition<Input> = {
  key: "link-create",
  type: "perform",
  resource: "link",
  title: "Create Scheduling Link",
  description:
    "Create a scheduling link in the current user's personal scope, or under a team/individual " +
    "scope when a scope slug is given.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "scopeSlug",
      label: "Scope slug",
      type: "string",
      hint: "e.g. `acme-inc` or `john`. Leave empty for your personal scope.",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "privateName", label: "Private name", type: "string", hint: "Only you see this." },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [{ value: "recurring", label: "recurring" }, { value: "single", label: "single" }],
    },
  ],
  output: [{ key: "id", type: "string", label: "Link ID" }],

  execute(input, ctx) {
    const scope = String(input.scopeSlug ?? "").trim();
    const path = scope ? `/scopes/${encodeId(scope)}/links` : "/links";
    return new SavvyCalClient(ctx).json(path, {
      method: "POST",
      body: compact({
        name: input.name,
        description: input.description,
        private_name: input.privateName,
        type: input.type,
      }),
    });
  },
};

export default linkCreate;
