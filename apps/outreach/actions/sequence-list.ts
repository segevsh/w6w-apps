import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "sequence-list",
  title: "List Sequences",
  noun: "Sequence",
  type: "sequence",
  path: "sequences",
  description:
    "List sequences. Use this to find the sequence ID that Add Prospect to Sequence needs.",
});
