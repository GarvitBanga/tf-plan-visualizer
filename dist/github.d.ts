export declare function postStickyComment(comment: string): Promise<string>;
export declare function isPullRequest(): boolean;
export declare function getPullRequestDetails(): {
    owner: string;
    repo: string;
    number: number;
} | null;
export declare function addReaction(commentId: number, reaction: "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes"): Promise<void>;
//# sourceMappingURL=github.d.ts.map