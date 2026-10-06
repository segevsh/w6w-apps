import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "person-list",
  resource: "person",
  title: "List People",
  description:
    "List the people on the list tied to the API key, in every subscription status. 25 per page; the vendor omits total counts and does not order by newest.",
  path: () => "/people",
  filterFields:
    "identifier, created_date, modified_date, family_name, given_name, email_address, phone_number, region, postal_code",
});
