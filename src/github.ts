import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';

const MARKER_PREFIX = '<!-- terraform-visualizer-marker:';

export async function postStickyComment(comment: string): Promise<string> {
  const token = core.getInput('github-token', { required: true }) || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token is required');
  }

  const octokit = new Octokit({ auth: token });
  const context = github.context;

  // Only run on pull requests
  if (context.eventName !== 'pull_request') {
    core.info('Not a pull request, skipping comment');
    return '';
  }

  const { owner, repo } = context.repo;
  const pullNumber = context.payload.pull_request!.number;
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
    } else {
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
  } catch (error) {
    core.error(`Failed to post comment: ${error}`);
    throw error;
  }
}

async function findExistingComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  runId: number
): Promise<any> {
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
  } catch (error) {
    core.warning(`Failed to find existing comment: ${error}`);
  }

  return null;
}

// Helper function to check if we're in a PR context
export function isPullRequest(): boolean {
  return github.context.eventName === 'pull_request';
}

// Helper function to get PR details
export function getPullRequestDetails(): { owner: string; repo: string; number: number } | null {
  if (!isPullRequest()) {
    return null;
  }

  const context = github.context;
  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    number: context.payload.pull_request!.number
  };
}

// Helper function to add a reaction to a comment
export async function addReaction(commentId: number, reaction: "+1" | "-1" | "laugh" | "confused" | "heart" | "hooray" | "rocket" | "eyes"): Promise<void> {
  const token = core.getInput('github-token', { required: true }) || process.env.GITHUB_TOKEN;
  if (!token) return;

  const octokit = new Octokit({ auth: token });
  const { owner, repo } = github.context.repo;

  try {
    await octokit.rest.reactions.createForIssueComment({
      owner,
      repo,
      comment_id: commentId,
      content: reaction
    });
  } catch (error) {
    core.debug(`Failed to add reaction: ${error}`);
  }
} 