import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "list-get",
  resource: "list",
  title: "Get List",
  description: "Fetch one email list by its numeric id.",
  path: "/lists",
  idLabel: "List ID",
  outputLabel: "Email list",
});
