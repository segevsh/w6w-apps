import type { ActionDefinition } from "@w6w/types";
import { TwoChatClient } from "../lib/client.ts";

interface Input {
  status?: string;
  resultsPerPage?: number;
  pageNumber?: number;
}

const numbersList: ActionDefinition<Input> = {
  key: "numbers-list",
  type: "read",
  resource: "channel",
  title: "List WhatsApp Numbers",
  description:
    "List the WhatsApp Web numbers connected to 2Chat (GET /whatsapp/get-numbers). These are " +
    "QR-paired phones, not WhatsApp Cloud API numbers.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "all",
      options: [
        { "value": "all", "label": "All" },
        { "value": "connected", "label": "Connected" },
        { "value": "disconnected", "label": "Disconnected" },
      ],
    },
    {
      key: "resultsPerPage",
      label: "Results per page",
      type: "number",
      hint: "2Chat's default is 50.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Zero-based page index. 2Chat's first page is 0.",
    },
  ],
  output: [
    {
      key: "numbers",
      type: "array",
      label:
        "Numbers: uuid, friendly_name, phone_number, connection_status (C/D/F), channel_type …",
    },
    { key: "count", type: "number", label: "Numbers on this page" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get("/whatsapp/get-numbers", {
      status: input.status,
      results_per_page: input.resultsPerPage,
      page_number: input.pageNumber ?? 0,
    });
  },
};

export default numbersList;
