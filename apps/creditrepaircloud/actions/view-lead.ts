import type { ActionDefinition } from "@w6w/types";
import {
  CreditRepairCloudClient,
  ENVELOPE_OUTPUT,
  LEAD_VIEW,
  type ParsedResponse,
} from "../lib/client.ts";

/**
 * `POST /api/lead/viewRecord` — read one Lead/Client record.
 *
 * The request is the same one-line document as `delete-lead`:
 * `<crcloud><client><id>…</id></client></crcloud>`. As on the delete and update
 * pages, the Request Parameters table omits `id` while the page's own example
 * XML carries it; it is required here.
 *
 * **What comes back is the part that could not be verified.** The vendor's
 * documentation never shows a successful response, and no test account was
 * available, so this action returns the generic envelope
 * (`lib/client.ts#parseXmlResponse`): `<success>`, plus every direct child of
 * `<result>` as a flat string map, plus the raw XML. It does not claim any
 * named field, and no workflow should be built on a guessed key. The README
 * states the gap.
 *
 * A missing or wrong `id` is refused by the vendor in the body, not the status
 * (4410 "Wrong ID in update" / 4413 "Incorrect Client ID"), and since this
 * vendor answers HTTP 200 for everything, the read raises the vendor's own
 * error rather than returning an empty record.
 */
const viewLead: ActionDefinition<Record<string, unknown>, ParsedResponse> = {
  key: "view-lead",
  type: "read",
  resource: "lead",
  title: "View Lead",
  description:
    "Read one Credit Repair Cloud lead or client record by id (POST /api/lead/viewRecord).",
  params: [
    {
      key: "id",
      label: "Record ID",
      type: "string",
      required: true,
      hint: "The id exactly as the API expects it — the vendor's own example XML passes the " +
        "encoded form (`<id>MQ==</id>`), not the plain integer shown in the CRM.",
    },
  ],
  output: ENVELOPE_OUTPUT,

  execute(input, ctx) {
    return new CreditRepairCloudClient(ctx, LEAD_VIEW).send(input);
  },
};

export default viewLead;
