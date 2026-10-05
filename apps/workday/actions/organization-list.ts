import { listAction } from "../lib/actions.ts";

import { idValue } from "../lib/client.ts";

export default listAction({
  key: "organization-list",
  resource: "organization",
  title: "List organizations of a type",
  description:
    "Organizations of one organization type (for example Cost Center or Company). Workday requires an " +
    "organization type on this call. Common service v1 `GET /organizations`; secured by Reports: Organization.",
  service: "common",
  path: "/organizations",
  params: [
    {
      key: "organizationType",
      label: "Organization type",
      type: "string",
      required: true,
      hint:
        "A Workday ID or reference ID of an Organization Type. Take the `id` from the organization types of your tenant.",
    },
  ],
  query: (i) => ({ organizationType: idValue(i.organizationType, "organizationType") }),
});
