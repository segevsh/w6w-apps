import { listAction } from "../lib/actions.ts";

import { list } from "../lib/client.ts";

export default listAction({
  key: "person-work-address-list",
  resource: "person",
  title: "List a person's work addresses",
  description:
    "A person's work addresses (address lines, city, postal code, country and usage). Person v4 `GET /people/{ID}/workAddresses`; secured by the matching Person Data / Self-Service domain.",
  service: "person",
  path: "/people/{ID}/workAddresses",
  idKey: "personId",
  idLabel: "Person ID",
  idHint: "A 32-character Workday ID or reference ID. Take it from a worker's `person.id`.",
  params: [
    { key: "primaryOnly", label: "Primary only", type: "boolean" },
    { key: "publicOnly", label: "Public only", type: "boolean" },
    {
      key: "usedFor",
      label: "Used for IDs",
      type: "string",
      hint: "Workday IDs of usage types, comma separated.",
    },
  ],
  query: (i) => ({
    primaryOnly: i.primaryOnly as boolean | undefined,
    publicOnly: i.publicOnly as boolean | undefined,
    usedFor: list(i.usedFor),
  }),
});
