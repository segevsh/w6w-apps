import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, compact, intId, optInt, reqString } from "../lib/client.ts";

interface Input {
  customersId: number | string;
  timeSince: string;
  timeUntil?: string;
  servicesId?: number | string;
  projectsId?: number | string;
  subprojectsId?: number | string;
  usersId?: number | string;
  billable?: string;
  text?: string;
  lumpsum?: number | string;
  lumpsumServicesId?: number | string;
  lumpsumServicesAmount?: number | string;
  hourlyRate?: number | string;
}

const createEntry: ActionDefinition<Input> = {
  key: "create-entry",
  type: "perform",
  resource: "entry",
  title: "Create Time Entry",
  description:
    "Create a time entry (POST /v2/entries) in one of three forms: a time span (`timeSince` + `timeUntil` + `servicesId`), a lump sum (`timeSince` + `servicesId` + `lumpsum`), or a lump-sum service (`timeSince` + `lumpsumServicesId` + `lumpsumServicesAmount`). `customersId` and `timeSince` are always required.",
  params: [
    {
      key: "customersId",
      label: "Customer ID",
      type: "number",
      required: true,
    },
    {
      key: "timeSince",
      label: "Time since",
      type: "string",
      required: true,
      hint: "ISO 8601 UTC, e.g. 2026-10-06T08:00:00Z.",
    },
    {
      key: "timeUntil",
      label: "Time until",
      type: "string",
      hint: "Set for a time-span entry.",
    },
    {
      key: "servicesId",
      label: "Service ID",
      type: "number",
      hint: "Required for time-span and lump-sum entries.",
    },
    {
      key: "projectsId",
      label: "Project ID",
      type: "number",
    },
    {
      key: "subprojectsId",
      label: "Subproject ID",
      type: "number",
    },
    {
      key: "usersId",
      label: "User ID",
      type: "number",
      hint: "Defaults to the authenticated user.",
    },
    {
      key: "billable",
      label: "Billable",
      type: "select",
      options: [{ value: "0", label: "Not billable" }, { value: "1", label: "Billable" }],
    },
    {
      key: "text",
      label: "Text",
      type: "string",
    },
    {
      key: "lumpsum",
      label: "Lump sum",
      type: "number",
      hint: "Amount for a lump-sum entry.",
    },
    {
      key: "lumpsumServicesId",
      label: "Lump-sum service ID",
      type: "number",
    },
    {
      key: "lumpsumServicesAmount",
      label: "Lump-sum service amount",
      type: "number",
    },
    {
      key: "hourlyRate",
      label: "Hourly rate",
      type: "number",
    },
  ],
  output: [
    { key: "entry", type: "object", label: "The created entry" },
    { key: "stopped", type: "object", label: "A clock entry stopped as a side effect, if any" },
  ],
  idempotent: false,

  async execute(input, ctx) {
    const lumpsumServicesId = optInt(input.lumpsumServicesId, "lumpsumServicesId");
    const hasSpan = input.timeUntil !== undefined && input.timeUntil !== "";
    const hasLumpsum = input.lumpsum !== undefined && input.lumpsum !== "";
    if (!hasSpan && !hasLumpsum && lumpsumServicesId === undefined) {
      throw new Error(
        "give timeUntil (time span), lumpsum, or lumpsumServicesId + lumpsumServicesAmount",
      );
    }
    const servicesId = optInt(input.servicesId, "servicesId");
    if (lumpsumServicesId === undefined && servicesId === undefined) {
      throw new Error("servicesId is required for a time-span or lump-sum entry");
    }
    if (lumpsumServicesId !== undefined && input.lumpsumServicesAmount === undefined) {
      throw new Error("lumpsumServicesAmount is required with lumpsumServicesId");
    }
    const body = await new ClockodoClient(ctx).call("/v2/entries", {
      body: compact({
        customers_id: intId(input.customersId, "customersId"),
        time_since: reqString(input.timeSince, "timeSince"),
        time_until: hasSpan ? input.timeUntil : undefined,
        services_id: lumpsumServicesId === undefined ? servicesId : undefined,
        projects_id: optInt(input.projectsId, "projectsId"),
        subprojects_id: optInt(input.subprojectsId, "subprojectsId"),
        users_id: optInt(input.usersId, "usersId"),
        billable: input.billable === undefined || input.billable === ""
          ? undefined
          : Number(input.billable),
        text: input.text,
        lumpsum: hasLumpsum ? Number(input.lumpsum) : undefined,
        lumpsum_services_id: lumpsumServicesId,
        lumpsum_services_amount:
          lumpsumServicesId === undefined || input.lumpsumServicesAmount === undefined
            ? undefined
            : Number(input.lumpsumServicesAmount),
        hourly_rate: input.hourlyRate === undefined || input.hourlyRate === ""
          ? undefined
          : Number(input.hourlyRate),
      }),
    });
    return { entry: body.entry ?? null, stopped: body.stopped ?? null };
  },
};

export default createEntry;
