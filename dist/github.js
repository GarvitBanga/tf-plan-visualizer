"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.postStickyComment = postStickyComment;
exports.isPullRequest = isPullRequest;
exports.getPullRequestDetails = getPullRequestDetails;
exports.addReaction = addReaction;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const rest_1 = require("@octokit/rest");
const MARKER_PREFIX = '<!-- terraform-visualizer-marker:';
async function postStickyComment(comment) {
    const token = core.getInput('github-token', { required: true }) || process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('GitHub token is required');
    }
    const octokit = new rest_1.Octokit({ auth: token });
    const context = github.context;
    // Only run on pull requests
    if (context.eventName !== 'pull_request') {
        core.info('Not a pull request, skipping comment');
        return '';
    }
    const { owner, repo } = context.repo;
    const pullNumber = context.payload.pull_request.number;
    const runId = context.runId;
    // Add marker to comment for sticky behavior
    const markedComment = `${comment}\n\n${MARKER_PREFIX} ${runId} -->`;
    try {
        // Find existing comment
        const existingComment = await findExistingComment(octokit, owner, repo, pullNumber, runId);
        if (existingComment) {
            // Update existing comment
            core.info('Updating existing comment...');
            await octokit.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existingComment.id,
                body: markedComment
            });
            return existingComment.html_url;
        }
        else {
            // Create new comment
            core.info('Creating new comment...');
            const response = await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: pullNumber,
                body: markedComment
            });
            return response.data.html_url;
        }
    }
    catch (error) {
        core.error(`Failed to post comment: ${error}`);
        throw error;
    }
}
async function findExistingComment(octokit, owner, repo, pullNumber, runId) {
    try {
        const comments = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: pullNumber,
            per_page: 100
        });
        for (const comment of comments.data) {
            if (comment.body && comment.body.includes(MARKER_PREFIX)) {
                const markerMatch = comment.body.match(new RegExp(`${MARKER_PREFIX} (\\d+) -->`));
                if (markerMatch && parseInt(markerMatch[1]) === runId) {
                    return comment;
                }
            }
        }
    }
    catch (error) {
        core.warning(`Failed to find existing comment: ${error}`);
    }
    return null;
}
// Helper function to check if we're in a PR context
function isPullRequest() {
    return github.context.eventName === 'pull_request';
}
// Helper function to get PR details
function getPullRequestDetails() {
    if (!isPullRequest()) {
        return null;
    }
    const context = github.context;
    return {
        owner: context.repo.owner,
        repo: context.repo.repo,
        number: context.payload.pull_request.number
    };
}
// Helper function to add a reaction to a comment
async function addReaction(commentId, reaction) {
    const token = core.getInput('github-token', { required: true }) || process.env.GITHUB_TOKEN;
    if (!token)
        return;
    const octokit = new rest_1.Octokit({ auth: token });
    const { owner, repo } = github.context.repo;
    try {
        await octokit.rest.reactions.createForIssueComment({
            owner,
            repo,
            comment_id: commentId,
            content: reaction
        });
    }
    catch (error) {
        core.debug(`Failed to add reaction: ${error}`);
    }
}
//# sourceMappingURL=github.js.map