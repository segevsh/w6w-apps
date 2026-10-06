import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, reqString } from "../lib/client.ts";

interface Input {
  name: string;
  number?: string;
  active?: boolean;
  note?: string;
}

const createService: ActionDefinition<Input> = {
  key: "create-service",
  type: "perform",
  resource: "service",
  title: "Create Service",
  description:
    "Create a service, the kind of work an entry is booked against (POST /v4/services). Only `name` is required.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
    },
    {
      key: "number",
      label: "Number",
      type: "string",
    },
    {
      key: "active",
      label: "Active",
      type: "boolean",
    },
    {
      key: "note",
      label: "Note",
      type: "string",
      hint: "Needs administrator or elevated access.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The created service" },
  ],
  idempotent: false,

  async execute(input, ctx) {
    const body = await new ClockodoClient(ctx).call("/v4/services", {
      body: compact({
        name: reqString(input.name, "name"),
        number: input.number,
        active: input.active,
        note: input.note,
      }),
    });
    return { data: body.data ?? null };
  },
};

export default createService;
