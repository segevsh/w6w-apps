import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

interface Input {
  siteName: string;
  from?: string;
  to?: string;
  utmCampaign?: string;
}

/**
 * `GET /api/sites/multiscreen/get-forms/{siteName}` — "Get form submissions".
 *
 * Answers a **bare array** of `FormSubmitRDT`
 * (`{ date, form_title, message, utm_campaign }`) — no envelope, unlike the
 * site list.
 *
 * Two things the docs state and this action passes on rather than hiding:
 *
 *  - **Omitting `from` returns every submission the site has ever collected.**
 *    That is the vendor's own note, and it is why the `from` hint says so: on a
 *    site with years of traffic this is a large response.
 *  - Form submissions have their own documented ceiling of **300 calls/minute**
 *    (the tightest of this app's endpoints after publish/unpublish), on top of
 *    the global 10 calls/second. It is not enforced here — Duda answers `429`
 *    and the client's error text names the limits.
 */
const getFormSubmissions: ActionDefinition<Input> = {
  key: "get-form-submissions",
  type: "read",
  resource: "form",
  title: "Get Form Submissions",
  description:
    "Read the contact-form submissions a site has collected. Duda's own rate limit for this " +
    "endpoint is 300 calls/minute.",
  params: [
    {
      key: "siteName",
      label: "Site name",
      type: "string",
      required: true,
      hint: "Duda's site alias (`site_name`).",
    },
    {
      key: "from",
      label: "From",
      type: "string",
      placeholder: "2026-09-01",
      hint: "Start date, `YYYY-MM-DD` (a time may be included). **Leave this empty and Duda " +
        "returns every form submission the site has ever collected**, which is why it is worth " +
        "setting on a busy site.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      placeholder: "2026-09-30",
      hint: "End date, `YYYY-MM-DD`. Omit for everything from `from` onwards.",
    },
    {
      key: "utmCampaign",
      label: "UTM campaign",
      type: "string",
      advanced: true,
      hint: "Only submissions carrying this `utm_campaign`.",
    },
  ],
  output: [
    {
      key: "[]",
      type: "array",
      label: "Submissions — a bare array of `{ date, form_title, message, utm_campaign }`",
    },
  ],

  execute(input, ctx) {
    return new DudaClient(ctx).request(
      `/api/sites/multiscreen/get-forms/${seg(input.siteName)}`,
      {
        query: {
          from: input.from,
          to: input.to,
          utm_campaign: input.utmCampaign,
        },
      },
    );
  },
};

export default getFormSubmissions;
