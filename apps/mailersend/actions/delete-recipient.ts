import { deleteById, seg } from "../lib/factories.ts";

export default deleteById({
  key: "delete-recipient",
  resource: "recipient",
  title: "Delete Recipient",
  description:
    "Delete a recipient record and its domain association (DELETE /v1/recipients/{id}), for example to honour an erasure request.",
  path: (id) => `/recipients/${seg(id)}`,
  idKey: "recipientId",
  idLabel: "Recipient ID",
});
