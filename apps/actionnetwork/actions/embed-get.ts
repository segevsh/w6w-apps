import { getAction, idParam } from "../lib/factory.ts";
import { need, seg } from "../lib/client.ts";

const FORMATS = [
  "embed_standard_default_styles",
  "embed_standard_layout_only_styles",
  "embed_standard_no_styles",
  "embed_full_default_styles",
  "embed_full_layout_only_styles",
  "embed_full_no_styles",
];

/** `GET /{action_type}/{id}/embed` — read-only, and only for actions made in the Action Network UI. */
export default getAction({
  key: "embed-get",
  resource: "embed",
  title: "Get Embed Code",
  description:
    "Get the copy-and-paste JavaScript that embeds an action's page on any website, in six style variants. Only actions created in Action Network's own interface have one.",
  params: [
    {
      key: "actionType",
      label: "Action type",
      type: "select",
      required: true,
      options: [
        { value: "petitions", label: "Petition" },
        { value: "events", label: "Event" },
        { value: "forms", label: "Form" },
        { value: "fundraising_pages", label: "Fundraising page" },
        { value: "advocacy_campaigns", label: "Advocacy campaign" },
        { value: "event_campaigns", label: "Event campaign" },
      ],
    },
    idParam("actionId", "Action ID"),
  ],
  path: (i) => `/${seg(need(i, "actionType"))}/${seg(need(i, "actionId"))}/embed`,
  output: FORMATS.map((key) => ({ key, type: "string" as const, label: "HTML embed snippet" })),
});
