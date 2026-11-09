import { webhookTrigger } from "../lib/triggers.ts";

/** A Mautic webhook on `mautic.form_on_submit`. */
export default webhookTrigger({
  key: "form-submitted",
  title: "Form Submitted",
  description:
    "Fires when a contact submits a Mautic form. The run gets the submission (form, contact, submitted values).",
  event: "mautic.form_on_submit",
  idOf: (p) => (p.submission as { id?: unknown } | undefined)?.id,
  sample: {
    event: "mautic.form_on_submit",
    timestamp: "2026-11-09T09:30:01+00:00",
    resourceId: "7",
    resource: {
      submission: {
        id: 7,
        form: { id: 3, name: "Newsletter signup", alias: "newsletter" },
        lead: { id: 42 },
        dateSubmitted: "2026-11-09T09:30:00+00:00",
        results: { email: "jackie@example.com" },
        page: null,
      },
      timestamp: "2026-11-09T09:30:01+00:00",
    },
  },
});
