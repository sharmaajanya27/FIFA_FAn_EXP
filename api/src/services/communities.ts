/** Team communities (PRD §7): per-team post feeds with likes. */
import type { CommunityPost, User } from "../domain/engagement.js";
import type { Store } from "../store/jsonStore.js";

export class CommunityService {
  constructor(private readonly store: Store) {}
  private get posts() {
    return this.store.collection<CommunityPost>("posts");
  }

  async createPost(input: {
    team: string;
    user: User;
    text: string;
  }): Promise<CommunityPost> {
    return this.posts.insert({
      team: input.team.toUpperCase(),
      userId: input.user.id,
      userName: input.user.displayName,
      text: input.text.trim(),
      likedBy: [],
      createdAt: new Date().toISOString(),
    });
  }

  async feed(team: string): Promise<CommunityPost[]> {
    const code = team.toUpperCase();
    return (await this.posts.find((p) => p.team === code)).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }

  /** Toggle a like for a user; returns the updated post. */
  async toggleLike(postId: string, userId: string): Promise<CommunityPost | undefined> {
    const post = await this.posts.findOne((p) => p.id === postId);
    if (!post) return undefined;
    const likedBy = post.likedBy.includes(userId)
      ? post.likedBy.filter((id) => id !== userId)
      : [...post.likedBy, userId];
    return this.posts.update(postId, { likedBy });
  }
}
