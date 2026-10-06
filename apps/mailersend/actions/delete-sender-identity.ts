import { deleteById, seg } from "../lib/factories.ts";

export default deleteById({
  key: "delete-sender-identity",
  resource: "sender-identity",
  title: "Delete Sender Identity",
  description: "Delete a sender identity (DELETE /v1/identities/{id}).",
  path: (id) => `/identities/${seg(id)}`,
  idKey: "identityId",
  idLabel: "Identity ID",
});
