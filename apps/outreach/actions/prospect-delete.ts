import { deleteAction } from "../lib/factory.ts";

export default deleteAction({
  key: "prospect-delete",
  title: "Delete Prospect",
  noun: "Prospect",
  type: "prospect",
  path: "prospects",
  description: "Permanently delete a prospect by ID.",
});
