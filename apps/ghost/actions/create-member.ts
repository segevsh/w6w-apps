import type { ActionDefinition } from "@w6w/types";
import { GhostClient } from "../lib/client.ts";

interface Input {
  email: string;
  name?: string;
  note?: string;
  labels?: string[];
}

interface MemberBody {
  email: string;
  name?: string;
  note?: string;
  labels?: string[];
}

const createMember: ActionDefinition<Input> = {
  key: "create-member",
  type: "perform",
  resource: "member",
  title: "Create Member",
  description: "Add a new free member to the site.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "labels", label: "Labels", type: "multiselect" },
  ],
  output: [{ key: "id", type: "string", label: "Member ID" }],

  execute(input, ctx) {
    const client = GhostClient.fromConnection(ctx);
    const body: MemberBody = { email: input.email };
    if (input.name !== undefined) body.name = input.name;
    if (input.note !== undefined) body.note = input.note;
    if (input.labels !== undefined) body.labels = input.labels;
    return client.create("members", body);
  },
};

export default createMember;
