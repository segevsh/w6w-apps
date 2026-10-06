import type { AppDefinition } from "@w6w/types";
import questionList from "./actions/question-list.ts";
import questionGet from "./actions/question-get.ts";
import questionAnswerList from "./actions/question-answer-list.ts";
import questionCommentList from "./actions/question-comment-list.ts";
import questionLinkedList from "./actions/question-linked-list.ts";
import questionRelatedList from "./actions/question-related-list.ts";
import questionFeaturedList from "./actions/question-featured-list.ts";
import questionUnansweredList from "./actions/question-unanswered-list.ts";
import questionNoAnswerList from "./actions/question-no-answer-list.ts";
import search from "./actions/search.ts";
import searchAdvanced from "./actions/search-advanced.ts";
import searchExcerpt from "./actions/search-excerpt.ts";
import similarQuestionList from "./actions/similar-question-list.ts";
import answerList from "./actions/answer-list.ts";
import answerGet from "./actions/answer-get.ts";
import answerCommentList from "./actions/answer-comment-list.ts";
import commentList from "./actions/comment-list.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userQuestionList from "./actions/user-question-list.ts";
import userAnswerList from "./actions/user-answer-list.ts";
import userBadgeList from "./actions/user-badge-list.ts";
import userTagList from "./actions/user-tag-list.ts";
import userReputationList from "./actions/user-reputation-list.ts";
import userAssociatedList from "./actions/user-associated-list.ts";
import moderatorList from "./actions/moderator-list.ts";
import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import tagWikiGet from "./actions/tag-wiki-get.ts";
import tagRelatedList from "./actions/tag-related-list.ts";
import tagFaqList from "./actions/tag-faq-list.ts";
import tagTopAnswererList from "./actions/tag-top-answerer-list.ts";
import tagTopAskerList from "./actions/tag-top-asker-list.ts";
import tagSynonymList from "./actions/tag-synonym-list.ts";
import badgeList from "./actions/badge-list.ts";
import privilegeList from "./actions/privilege-list.ts";
import postGet from "./actions/post-get.ts";
import siteList from "./actions/site-list.ts";
import infoGet from "./actions/info-get.ts";
import apiKey from "./auth/api-key.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    questionList,
    questionGet,
    questionAnswerList,
    questionCommentList,
    questionLinkedList,
    questionRelatedList,
    questionFeaturedList,
    questionUnansweredList,
    questionNoAnswerList,
    search,
    searchAdvanced,
    searchExcerpt,
    similarQuestionList,
    answerList,
    answerGet,
    answerCommentList,
    commentList,
    userList,
    userGet,
    userQuestionList,
    userAnswerList,
    userBadgeList,
    userTagList,
    userReputationList,
    userAssociatedList,
    moderatorList,
    tagList,
    tagGet,
    tagWikiGet,
    tagRelatedList,
    tagFaqList,
    tagTopAnswererList,
    tagTopAskerList,
    tagSynonymList,
    badgeList,
    privilegeList,
    postGet,
    siteList,
    infoGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
