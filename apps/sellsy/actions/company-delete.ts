import { deleteAction } from "../lib/actions.ts";

export default deleteAction({
  "key": "company",
  "noun": "company",
  "path": "/companies",
  "scope": "companies.write",
});
