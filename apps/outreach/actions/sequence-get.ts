import { getAction } from "../lib/factory.ts";
export default getAction({
  key: "sequence-get",
  title: "Get Sequence",
  noun: "Sequence",
  type: "sequence",
  path: "sequences",
  description:
    "Fetch one sequence by ID, including its enabled/locked state and engagement counts.",
});
