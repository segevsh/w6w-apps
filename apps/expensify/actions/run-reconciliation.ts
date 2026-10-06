import type { ActionDefinition } from "@w6w/types";
import { compact, dateText, emailAction, opts, requiredText, runFileJob } from "../lib/client.ts";

interface Input {
  template: string;
  startDate: string;
  endDate: string;
  domain: string;
  type: "Unreported" | "All";
  feed?: string;
  fileExtension?: string;
  emailRecipients?: string[] | string;
}

const EXTENSIONS = ["csv", "txt", "json", "xml"];

/** `reconciliation` — the Reconciliation exporter. Synchronous only (`async: false`). */
const runReconciliation: ActionDefinition<Input> = {
  key: "run-reconciliation",
  type: "perform",
  resource: "reconciliation",
  title: "Run Card Reconciliation",
  description:
    "Export card transactions for a domain and date range through a reconciliation template. Returns the generated file name — download it with Download File using file system `reconciliation`. Domain admin credentials only.",
  idempotent: false,
  params: [
    {
      key: "template",
      label: "Reconciliation template",
      type: "code",
      required: true,
      hint:
        "Freemarker template. Reconciliation templates iterate `cards as card, reports` and differ from export templates.",
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      required: true,
      placeholder: "2026-01-01",
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      required: true,
      placeholder: "2026-02-01",
    },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "Only credentials of a domain admin on this domain work.",
    },
    {
      key: "type",
      label: "Expenses",
      type: "select",
      required: true,
      default: "Unreported",
      options: [
        { value: "Unreported", label: "Unreported card expenses only" },
        { value: "All", label: "All card expenses" },
      ],
    },
    {
      key: "feed",
      label: "Card feed",
      type: "string",
      hint: "A feed name, or export_all_feeds for every feed.",
    },
    {
      key: "fileExtension",
      label: "File format",
      type: "select",
      options: opts(EXTENSIONS),
      hint: "Defaults to csv.",
    },
    {
      key: "emailRecipients",
      label: "Email link to",
      type: "array",
      item: { type: "string" },
    },
  ],
  output: [{ key: "fileName", type: "string", label: "Generated file name" }],

  async execute(input, ctx) {
    if (input.type !== "Unreported" && input.type !== "All") {
      throw new Error("type must be Unreported or All");
    }
    if (input.fileExtension && !EXTENSIONS.includes(input.fileExtension)) {
      throw new Error(`fileExtension must be one of ${EXTENSIONS.join(", ")}`);
    }
    const onFinish = emailAction(input.emailRecipients);
    const fileName = await runFileJob(ctx, {
      type: "reconciliation",
      inputSettings: compact({
        startDate: dateText("startDate", input.startDate, true),
        endDate: dateText("endDate", input.endDate, true),
        domain: requiredText("domain", input.domain),
        feed: input.feed,
        type: input.type,
        async: false,
      }),
      outputSettings: compact({ fileExtension: input.fileExtension }),
      ...(onFinish ? { onFinish: [onFinish] } : {}),
    }, { template: requiredText("template", input.template) });
    return { fileName };
  },
};

export default runReconciliation;
