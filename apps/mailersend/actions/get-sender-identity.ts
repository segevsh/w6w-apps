import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-sender-identity",
  resource: "sender-identity",
  title: "Get Sender Identity",
  description: "Read one sender identity (GET /v1/identities/{id}).",
  path: (id) => `/identities/${seg(id)}`,
  idKey: "identityId",
  idLabel: "Identity ID",
});
