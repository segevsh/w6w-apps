import campaignList from "../actions/campaign-list.ts";
import campaignSequenceList from "../actions/campaign-sequence-list.ts";
import companyList from "../actions/company-list.ts";
import contactNotesList from "../actions/contact-notes-list.ts";
import contactTagsList from "../actions/contact-tags-list.ts";
import emailList from "../actions/email-list.ts";
import opportunityList from "../actions/opportunity-list.ts";
import opportunityStageList from "../actions/opportunity-stage-list.ts";
import orderList from "../actions/order-list.ts";
import productList from "../actions/product-list.ts";
import subscriptionList from "../actions/subscription-list.ts";
import tagContactsList from "../actions/tag-contacts-list.ts";
import tagList from "../actions/tag-list.ts";
import taskList from "../actions/task-list.ts";
import userList from "../actions/user-list.ts";
import { recordTrigger } from "../lib/triggers.ts";

const rows = (field: string) => (result: unknown) =>
  (result as Record<string, unknown>)[field] as unknown[] ?? [];

export const newCampaign = recordTrigger({
  key: "new-campaign",
  title: "Campaign",
  action: campaignList,
  items: rows("campaigns"),
});
export const newCampaignSequence = recordTrigger({
  key: "new-campaign-sequence",
  title: "Campaign Sequence",
  action: campaignSequenceList,
  items: rows("sequences"),
});
export const newCompany = recordTrigger({
  key: "new-company",
  title: "Company",
  action: companyList,
  items: rows("companies"),
});
export const newContactNote = recordTrigger({
  key: "new-contact-note",
  title: "Contact Note",
  action: contactNotesList,
  items: rows("notes"),
});
export const newContactTag = recordTrigger({
  key: "new-contact-tag",
  title: "Contact Tag",
  action: contactTagsList,
  items: rows("tags"),
});
export const newEmail = recordTrigger({
  key: "new-email",
  title: "Email",
  action: emailList,
  items: rows("emails"),
});
export const newOpportunity = recordTrigger({
  key: "new-opportunity",
  title: "Opportunity",
  action: opportunityList,
  items: rows("opportunities"),
});
export const newOpportunityStage = recordTrigger({
  key: "new-opportunity-stage",
  title: "Opportunity Stage",
  action: opportunityStageList,
  items: rows("stages"),
});
export const newOrder = recordTrigger({
  key: "new-order",
  title: "Order",
  action: orderList,
  items: rows("orders"),
});
export const newProduct = recordTrigger({
  key: "new-product",
  title: "Product",
  action: productList,
  items: rows("products"),
});
export const newSubscription = recordTrigger({
  key: "new-subscription",
  title: "Subscription",
  action: subscriptionList,
  items: rows("subscriptions"),
});
export const newTagContact = recordTrigger({
  key: "new-tag-contact",
  title: "Tag Contact",
  action: tagContactsList,
  items: rows("contacts"),
});
export const newTag = recordTrigger({
  key: "new-tag",
  title: "Tag",
  action: tagList,
  items: rows("tags"),
});
export const newTask = recordTrigger({
  key: "new-task",
  title: "Task",
  action: taskList,
  items: rows("tasks"),
});
export const newUser = recordTrigger({
  key: "new-user",
  title: "User",
  action: userList,
  items: rows("users"),
});
