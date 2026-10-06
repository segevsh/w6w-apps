import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, looseValue, PlacidClient, toList } from "../lib/client.ts";
import { passthroughParam, renderOutput, transferParam, webhookParam } from "../lib/params.ts";

interface Input {
  urls: string[] | string;
  webhook_success?: string;
  passthrough?: unknown;
  transfer?: unknown;
}

/** `POST /pdfs/merge` — merge 2-10 existing PDFs by URL. */
const action: ActionDefinition<Input, unknown> = {
  key: "pdf-merge",
  type: "perform",
  resource: "pdf",
  title: "Merge PDFs",
  description:
    "Merge 2 to 10 existing PDF files, given by URL, into one PDF. Asynchronous; not safe to retry blindly.",
  idempotent: false,
  params: [
    {
      key: "urls",
      label: "PDF URLs",
      type: "multiselect",
      required: true,
      hint: "2 to 10 PDF URLs (a comma-separated string also works), merged in order.",
    },
    webhookParam,
    passthroughParam,
    transferParam,
  ],
  output: [
    ...renderOutput("pdf_url"),
  ],

  async execute(input, ctx) {
    const urls = toList(input.urls) ?? [];
    if (urls.length < 2 || urls.length > 10) {
      throw new Error("`urls` needs between 2 and 10 PDF URLs");
    }
    return await new PlacidClient(ctx).json("/pdfs/merge", {
      method: "POST",
      body: compact({
        urls,
        webhook_success: input.webhook_success,
        passthrough: looseValue(input.passthrough),
        transfer: asOptionalJson(input.transfer, "transfer"),
      }),
    });
  },
};

export default action;
