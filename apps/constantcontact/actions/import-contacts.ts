import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  importData: Array<Record<string, unknown>>;
  listIds: string[];
  smsPermissionToSend?: "explicit" | "not_set";
}

/**
 * `POST /v3/activities/contacts_json_import` — the bulk import job.
 * `201` queues it; poll `activity_id` with Get Activity Status.
 *
 * The row shape is **flat and its own vocabulary** — it is not the contact
 * resource. Keys are `email`, `first_name`, `last_name`, `job_title`,
 * `company_name`, `birthday_month`, `birthday_day`, `anniversary`, the phone
 * family (`phone`, `home_phone`, `work_phone`, `mobile_phone`, `other_phone`),
 * the address families (`street`/`city`/`state`/`zip`/`country` and their
 * `home_`, `work_`, `other_` variants), and `sms_number` /
 * `sms_consent_date`. A custom field is set with a `cf:` prefix on the field's
 * *name*, e.g. `"cf:membership_level": "gold"`. Each row needs an `email`
 * and/or an `sms_number`.
 *
 * The consent consequence is the part worth reading twice: importing a **new**
 * contact this way sets `permission_to_send` to `implicit` and `opt_in_source`
 * to `Account` automatically. There is no way to import somebody as
 * `explicit`. Importing an **existing** contact is a partial update and leaves
 * their permission alone.
 *
 * Rows are passed through verbatim — no key translation happens here, because
 * inventing a mapping between this vocabulary and the contact resource's would
 * hide exactly the differences a caller needs to see.
 *
 * `idempotent: true` — the import keys on the email address, so re-running the
 * same payload updates the same contacts rather than duplicating them.
 */
const importContacts: ActionDefinition<Input> = {
  key: "import-contacts",
  type: "perform",
  resource: "activity",
  title: "Import Contacts (bulk)",
  description:
    "Queue a bulk JSON contact import. New contacts land as `implicit` permission. Asynchronous — poll the returned activity_id.",
  idempotent: true,
  params: [
    {
      key: "importData",
      label: "Import rows",
      type: "json",
      required: true,
      hint:
        "JSON array. Flat keys, not the contact resource: `email`, `first_name`, `last_name`, `phone`, `street`, `city`, `state`, `zip`, `country`, `sms_number`, and `cf:<field_name>` for a custom field. Each row needs an `email` and/or an `sms_number`.",
    },
    {
      key: "listIds",
      label: "Target list IDs",
      type: "json",
      required: true,
      hint: "JSON array of up to 50 `list_id` values. Every imported contact joins all of them.",
    },
    {
      key: "smsPermissionToSend",
      label: "SMS permission",
      type: "select",
      hint: "`explicit` requires an `sms_consent_date` on every row carrying an `sms_number`.",
      options: [
        { value: "not_set", label: "Not set" },
        { value: "explicit", label: "Explicit" },
      ],
    },
  ],
  output: [
    { key: "activity_id", type: "string", label: "Activity ID to poll" },
    { key: "state", type: "string", label: "Activity state" },
    { key: "status", type: "object", label: "Row counters" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    ctx.log("info", "queueing contact import", { rows: input.importData.length });
    const body: Record<string, unknown> = {
      import_data: input.importData,
      list_ids: input.listIds,
    };
    if (input.smsPermissionToSend) body.sms_permission_to_send = input.smsPermissionToSend;
    return client.request("/activities/contacts_json_import", { method: "POST", body });
  },
};

export default importContacts;
