import { getAction } from "../lib/factory.ts";
export default getAction({
  key: "prospect-get",
  title: "Get Prospect",
  noun: "Prospect",
  type: "prospect",
  path: "prospects",
  description: "Fetch one prospect by ID, optionally with related resources included.",
});
