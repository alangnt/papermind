export type GroupArticleRef = {
  arxiv_id: string;
  added_by: string;
  added_at: string;
};

export type Group = {
  id: string;
  name: string;
  owner: string;
  members: string[];
  isOwner: boolean;
  articleCount: number;
  articles: GroupArticleRef[];
  updatedAt: string;
};
