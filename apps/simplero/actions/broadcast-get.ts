import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "broadcast-get",
  resource: "broadcast",
  title: "Get Broadcast",
  description:
    "Fetch one email broadcast by its numeric id, including its delivery and engagement counts.",
  path: "/broadcasts",
  idLabel: "Broadcast ID",
  outputLabel: "Broadcast",
});
