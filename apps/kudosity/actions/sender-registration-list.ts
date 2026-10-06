import type { ActionDefinition } from "@w6w/types";
import { KudosityClient } from "../lib/client.ts";

/**
 * `GET /v2/senders/registrations` — page-numbered. Answers
 * `{data: {registrations}, meta: {pagination: {type: "page", page, limit, total_count}}}`.
 */
interface Input {
  page?: number;
  sender?: string;
  status?: string;
  childAccountId?: string;
}

const senderRegistrationList: ActionDefinition<Input> = {
  key: "sender-registration-list",
  type: "search",
  resource: "sender",
  title: "List Sender Registrations",
  description: "List the sender registrations (numbers and alphanumeric IDs) on the account.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { min: 1, integer: true },
    },
    { key: "sender", label: "Sender", type: "string", hint: "E.164 without the plus." },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "One or more comma-separated: PENDING_APPROVAL, VERIFIED, REJECTED, CANCELLED.",
    },
    {
      key: "childAccountId",
      label: "Child account ID",
      type: "string",
      hint: "Parent accounts only.",
    },
  ],
  output: [
    { key: "registrations", type: "array", label: "Registrations" },
    { key: "pagination", type: "object", label: "Pagination (page, limit, total_count)" },
  ],

  async execute(input, ctx) {
    const { data, meta } = await new KudosityClient(ctx).data<{ registrations?: unknown[] }>(
      "/senders/registrations",
      {
        query: {
          page: input.page,
          sender: input.sender,
          status: input.status,
          child_account_id: input.childAccountId,
        },
      },
    );
    return { registrations: data?.registrations ?? [], pagination: meta?.pagination ?? null };
  },
};

export default senderRegistrationList;
