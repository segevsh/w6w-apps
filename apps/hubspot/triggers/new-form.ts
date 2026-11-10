import { FORMS_ACTION, newSnapshotTrigger } from "../lib/polls.ts";

/**
 * The portal's marketing forms are a small configuration collection (cursor-paged, 100 a page,
 * walked in full each check and capped at 2000), so the whole list is watched as a snapshot.
 */
export default newSnapshotTrigger({
  key: "new-form",
  title: "New Form",
  description:
    "Polls the HubSpot marketing forms and emits each form added since the last check. The run gets the form.",
  action: FORMS_ACTION,
  sample: {
    change: "added",
    key: "f1a2b3c4-0000-4000-8000-000000000001",
    values: { id: "f1a2b3c4-0000-4000-8000-000000000001", name: "Contact us", formType: "hubspot" },
  },
});
