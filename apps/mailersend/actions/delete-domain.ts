import { deleteById, seg } from "../lib/factories.ts";

export default deleteById({
  key: "delete-domain",
  resource: "domain",
  title: "Delete Domain",
  description:
    "Permanently delete a sending domain (DELETE /v1/domains/{id}). Sending from it stops immediately.",
  path: (id) => `/domains/${seg(id)}`,
  idKey: "domainId",
  idLabel: "Domain ID",
});
