import { type Input, listAction, optionalIdParam, scopedPath } from "../lib/factory.ts";

const PARENT = { key: "formId", base: "/forms" };

export default listAction({
  key: "submission-list",
  resource: "submission",
  title: "List Submissions",
  description:
    "List submissions: people who submitted a form. Scope by form or by person. Give exactly one of the two.",
  params: [
    optionalIdParam("formId", "Form ID"),
    optionalIdParam("personId", "Person ID", "List this person's submissions instead."),
  ],
  path: (i: Input) => scopedPath(i, PARENT, "submissions"),
  filterFields: "identifier, created_date, modified_date",
});
