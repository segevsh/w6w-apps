import { need, seg } from "../lib/client.ts";
import { getAction, idParam } from "../lib/factory.ts";
import { PERSON_OUTPUT } from "../lib/person.ts";

export default getAction({
  key: "person-get",
  resource: "person",
  title: "Get Person",
  description: "Fetch one person by their Action Network id.",
  params: [idParam("personId", "Person ID", "The UUID, with or without `action_network:`.")],
  path: (i) => `/people/${seg(need(i, "personId"))}`,
  output: PERSON_OUTPUT,
});
