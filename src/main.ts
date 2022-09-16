import * as core from '@actions/core';
import * as github from '@actions/github';
import type {
	PullRequestEvent,
	PushEvent,
} from '@octokit/webhooks-definitions/schema';
import picomatch from 'picomatch';

async function run(): Promise<void> {
	const client = github.getOctokit(core.getInput('token', { required: true }));
	const pattern = picomatch(core.getInput('pattern', { required: true }));

	// Kudos to https://github.com/jitterbit/get-changed-files for their code to get changed files
	const eventName = github.context.eventName;

	// Define the base and head commits to be extracted from the payload.
	let base: string | undefined;
	let head: string | undefined;
	switch (eventName) {
		case 'pull_request': {
			const payload: PullRequestEvent = github.context
				.payload as PullRequestEvent;

			base = payload.pull_request.base.sha;
			head = payload.pull_request.head.sha;
			break;
		}
		case 'push': {
			const payload = github.context.payload as PushEvent;
			base = payload.before;
			head = payload.after;
			break;
		}
		default:
			return core.setFailed(
				`This action only supports pull requests and pushes, ${github.context.eventName} events are not supported. ` +
					"Please submit an issue on this action's GitHub repo if you believe this in correct.",
			);
	}

	if (!base || !head) {
		return core.setFailed(
			`The base and head commits are missing from the payload for this ${github.context.eventName} event. ` +
				"Please submit an issue on this action's GitHub repo.",
		);
	}

	// Log the base and head commits
	core.info(`Base commit: ${base}`);
	core.info(`Head commit: ${head}`);

	// Use GitHub's compare two commits API.
	// https://developer.github.com/v3/repos/commits/#compare-two-commits
	const response = await client.rest.repos.compareCommitsWithBasehead({
		basehead: `${base}...${head}`,
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
	});
	// Ensure that the head commit is ahead of the base commit.
	if (response.data.status !== 'ahead') {
		core.setFailed(
			`The head commit for this ${github.context.eventName} event is not ahead of the base commit. ` +
				"Please submit an issue on this action's GitHub repo.",
		);
	}

	response.data.files?.forEach((file) =>
		core.info(`Changed File: ${file.filename}`),
	);

	const matched = response.data.files?.filter((file) => pattern(file.filename));
	matched?.forEach((file) => core.info(`Matched: ${file.filename}`));

	core.setOutput('changed', matched !== undefined && matched.length > 0);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- Entry point
run();
