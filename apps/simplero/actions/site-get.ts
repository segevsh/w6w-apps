import { getAction } from "../lib/factory.ts";

export default getAction({
  key: "site-get",
  resource: "site",
  title: "Get Site",
  description: "Fetch one member site by its numeric id.",
  path: "/sites",
  idLabel: "Site ID",
  outputLabel: "Site",
});
