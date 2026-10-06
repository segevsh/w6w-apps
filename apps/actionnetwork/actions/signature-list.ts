import { type Input, listAction, optionalIdParam, scopedPath } from "../lib/factory.ts";

const PARENT = { key: "petitionId", base: "/petitions" };

export default listAction({
  key: "signature-list",
  resource: "signature",
  title: "List Signatures",
  description:
    "List signatures: people who signed a petition. Scope by petition or by person. Give exactly one of the two.",
  params: [
    optionalIdParam("petitionId", "Petition ID"),
    optionalIdParam("personId", "Person ID", "List this person's signatures instead."),
  ],
  path: (i: Input) => scopedPath(i, PARENT, "signatures"),
  filterFields: "identifier, created_date, modified_date",
});
