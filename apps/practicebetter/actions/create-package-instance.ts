import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, PracticeBetterClient } from "../lib/client.ts";

/**
 * `POST /consultant/packages/instances` — sell a client a package.
 *
 * Security: `[read, write]`. The document's own summary for this operation is
 * "Create Package"; the body's required fields are `clientRecordId`, `packageId`
 * and `name`.
 *
 * The three ids are all distinct things and all come from somewhere else in this
 * app: `clientRecordId` from `list-client-records`, `packageId` from
 * `list-packages` (the template), and `asConsultantId` from the consultant list
 * `get-consultant-profile` belongs to. `fee`, `services` and `courses` are
 * vendor sub-objects whose element shapes the document does not publish, so they
 * are passed through as free-form JSON rather than reshaped.
 *
 * Not idempotent: selling the same package twice creates two instances, and the
 * `notify` flag means a retry can also notify the client twice.
 */
interface Input {
  clientRecordId: string;
  packageId: string;
  name: string;
  asConsultantId?: string;
  fee?: unknown;
  expiryDate?: string;
  maximumSessionsPerMonth?: number;
  maximumSessionsPerWeek?: number;
  notes?: string;
  notify?: boolean;
  notificationOptions?: unknown;
  services?: unknown;
  courses?: unknown;
}

const createPackageInstance: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-package-instance",
  type: "perform",
  resource: "package",
  title: "Create Package",
  description:
    "Sell a package template to a client: creates the client's own instance of it with its " +
    "allowances, expiry and notification choices.",
  idempotent: false,
  params: [
    {
      key: "clientRecordId",
      label: "Client record ID",
      type: "string",
      required: true,
      hint: "The record buying the package.",
    },
    {
      key: "packageId",
      label: "Package ID",
      type: "string",
      required: true,
      hint: "The package template — the id `list-packages` returns.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Name for this instance, as it will show on the client's account.",
    },
    {
      key: "asConsultantId",
      label: "Sell as consultant ID",
      type: "string",
      hint: "Attribute the sale to this consultant, where the caller may act for several.",
    },
    {
      key: "fee",
      label: "Fee",
      type: "json",
      hint:
        "A `Money` object (the document types this field as `Money`), overriding the package's price.",
    },
    {
      key: "expiryDate",
      label: "Expiry date",
      type: "datetime",
      hint: "When the instance expires (date-time).",
    },
    {
      key: "maximumSessionsPerMonth",
      label: "Maximum sessions per month",
      type: "number",
      validation: { integer: true },
      hint: "Monthly session allowance for this instance.",
    },
    {
      key: "maximumSessionsPerWeek",
      label: "Maximum sessions per week",
      type: "number",
      validation: { integer: true },
      hint: "Weekly session allowance for this instance.",
    },
    { key: "notes", label: "Notes", type: "text", hint: "Notes recorded against the sale." },
    {
      key: "notify",
      label: "Notify the client",
      type: "boolean",
      hint: "Notify the client that the package was added to their account.",
    },
    {
      key: "notificationOptions",
      label: "Notification options",
      type: "json",
      hint: "Per-sale notification choices. The document types this as an object without " +
        "publishing its keys.",
    },
    {
      key: "services",
      label: "Services",
      type: "json",
      hint:
        "A JSON array of service-detail objects included in the package. The document does not " +
        "publish the element schema, so the array is passed through as given.",
    },
    {
      key: "courses",
      label: "Courses",
      type: "json",
      hint:
        "A JSON array of course-detail objects included in the package. The element schema is " +
        "not published, so the array is passed through as given.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Instance ID" },
    { key: "name", type: "string", label: "Instance name" },
    { key: "clientRecord", type: "object", label: "The client record that bought it" },
    { key: "expiryDate", type: "string", label: "Expiry date" },
  ],

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).request<Record<string, unknown>>(
      "/consultant/packages/instances",
      {
        method: "POST",
        body: {
          clientRecordId: input.clientRecordId,
          packageId: input.packageId,
          name: input.name,
          asConsultantId: input.asConsultantId,
          fee: asOptionalJson<Record<string, unknown>>(input.fee, "fee"),
          expiryDate: input.expiryDate,
          maximumSessionsPerMonth: input.maximumSessionsPerMonth,
          maximumSessionsPerWeek: input.maximumSessionsPerWeek,
          notes: input.notes,
          notify: input.notify,
          notificationOptions: asOptionalJson<Record<string, unknown>>(
            input.notificationOptions,
            "notificationOptions",
          ),
          services: asOptionalJson<unknown[]>(input.services, "services"),
          courses: asOptionalJson<unknown[]>(input.courses, "courses"),
        },
      },
    );
  },
};

export default createPackageInstance;
