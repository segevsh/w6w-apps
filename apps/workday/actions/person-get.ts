import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "person-get",
  resource: "person",
  title: "Get a person",
  description:
    "A person: legal and preferred name plus links to every contact-information collection. The ID is the " +
    "person `id` returned by a worker (`person.id`). Person v4 `GET /people/{ID}`.",
  service: "person",
  path: "/people/{ID}",
  idKey: "personId",
  idLabel: "Person ID",
  idHint: "A 32-character Workday ID or reference ID. Take it from a worker's `person.id`.",
});
