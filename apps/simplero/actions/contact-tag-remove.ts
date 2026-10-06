import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  tagId: number;
}

export default contactAction<Input>({
  key: "contact-tag-remove",
  title: "Remove Tag from Contact",
  description: "Remove a tag from a contact.",
  action: "remove_tag",
  idempotent: false,
  params: [contactIdParam, refParam("tagId", "Tag ID", "The tag to remove.")],
  body: (i) => ({ tag_id: i.tagId }),
});
