import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  tagId: number;
}

export default contactAction<Input>({
  key: "contact-tag-add",
  title: "Add Tag to Contact",
  description: "Apply a tag to a contact.",
  action: "add_tag",
  idempotent: false,
  params: [contactIdParam, refParam("tagId", "Tag ID", "The tag to apply, e.g. from List Tags.")],
  body: (i) => ({ tag_id: i.tagId }),
});
