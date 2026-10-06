import { getAction, idParam, optionalIdParam, scopedItemPath } from "../lib/factory.ts";
import { recordOutput } from "../lib/person.ts";

const PARENT = { key: "petitionId", base: "/petitions" };

export default getAction({
  key: "signature-get",
  resource: "signature",
  title: "Get Signature",
  description:
    "Fetch one signature by id, under its petition or under the person. Give exactly one of the two.",
  params: [
    idParam("signatureId", "Signature ID"),
    optionalIdParam("petitionId", "Petition ID"),
    optionalIdParam("personId", "Person ID"),
  ],
  path: (i) => scopedItemPath(i, PARENT, "signatures", "signatureId"),
  output: recordOutput(
    { key: "comments", type: "string", label: "Comment left with the signature" },
  ),
});
