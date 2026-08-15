import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `POST /students` — grant a student access to a ThriveCart Learn course.
 * Not idempotent: the vendor doesn't document deduplication by email/course,
 * so a retry risks a second `auto_signin_url`/access grant.
 *
 * `orderInfo*` optionally links the access to a ThriveCart order, so the
 * vendor can auto-revoke it if the linked subscription is later cancelled.
 * The three fields nest under `order_info[...]` on the wire — the only place
 * in this app's surface that does — so they are sent as literal bracketed
 * form keys rather than modelled as a `group` param, matching the vendor's
 * documented field names exactly.
 */
interface Input {
  email: string;
  name?: string;
  courseId: string;
  tags?: string[] | string;
  orderId?: string;
  purchaseType?: string;
  purchaseId?: string;
  triggerEmails?: boolean;
  mode?: string;
}

const studentCreate: ActionDefinition<Input> = {
  key: "student-create",
  type: "perform",
  resource: "student",
  title: "Create Student",
  description: "Grant a new student access to a ThriveCart Learn course.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true, hint: "Used to sign in." },
    {
      key: "name",
      label: "Name",
      type: "string",
      validation: { maxLength: 150 },
    },
    { key: "courseId", label: "Course ID", type: "string", required: true },
    { key: "tags", label: "Tags", type: "multiselect" },
    {
      key: "orderId",
      label: "Order ID",
      type: "string",
      advanced: true,
      hint: "Optional. Associate this access with a ThriveCart order.",
    },
    {
      key: "purchaseType",
      label: "Purchase type",
      type: "select",
      advanced: true,
      options: [
        { value: "product", label: "Product" },
        { value: "bump", label: "Bump" },
        { value: "upsell", label: "Upsell" },
        { value: "downsell", label: "Downsell" },
      ],
      hint: "Required if Order ID is set.",
    },
    {
      key: "purchaseId",
      label: "Purchase item ID",
      type: "string",
      advanced: true,
      hint: "Required if Order ID is set — the numeric ID of the item purchased.",
    },
    { key: "triggerEmails", label: "Send emails", type: "boolean", default: true },
    modeParam,
  ],
  output: [
    { key: "auto_signin_url", type: "string", label: "Auto sign-in URL" },
    { key: "signin_url", type: "string", label: "Sign-in URL" },
    { key: "student", type: "object", label: "Student" },
  ],

  execute(input, ctx) {
    const tags = input.tags === undefined
      ? undefined
      : Array.isArray(input.tags)
      ? input.tags
      : [input.tags];
    return new ThriveCartClient(ctx).post("/students", {
      form: {
        email: input.email,
        name: input.name,
        course_id: input.courseId,
        tags,
        "order_info[order_id]": input.orderId,
        "order_info[purchase_type]": input.purchaseType,
        "order_info[purchase_id]": input.purchaseId,
        trigger_emails: input.triggerEmails ?? true,
      },
      mode: input.mode,
    });
  },
};

export default studentCreate;
