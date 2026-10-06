import { listAction } from "../lib/factory.ts";

export default listAction({
  key: "order-draft-list",
  resource: "order",
  title: "List Draft Orders",
  description: "List draft sales orders.",
  path: "/orders/drafts",
});
