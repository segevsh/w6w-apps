import { getAction, idParam, optionalIdParam, scopedItemPath } from "../lib/factory.ts";
import { recordOutput } from "../lib/person.ts";

const PARENT = { key: "formId", base: "/forms" };

export default getAction({
  key: "submission-get",
  resource: "submission",
  title: "Get Submission",
  description:
    "Fetch one submission by id, under its form or under the person. Give exactly one of the two.",
  params: [
    idParam("submissionId", "Submission ID"),
    optionalIdParam("formId", "Form ID"),
    optionalIdParam("personId", "Person ID"),
  ],
  path: (i) => scopedItemPath(i, PARENT, "submissions", "submissionId"),
  output: recordOutput(),
});
