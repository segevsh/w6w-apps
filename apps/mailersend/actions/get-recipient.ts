import { getById, seg } from "../lib/factories.ts";

export default getById({
  key: "get-recipient",
  resource: "recipient",
  title: "Get Recipient",
  description: "Read one recipient and its domain (GET /v1/recipients/{id}).",
  path: (id) => `/recipients/${seg(id)}`,
  idKey: "recipientId",
  idLabel: "Recipient ID",
});
