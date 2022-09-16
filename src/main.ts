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
	let filesChanged: string[] = [];

	if (eventName === 'pull_request') {
		const payload: PullRequestEvent = github.context
			.payload as PullRequestEvent;

		const base = payload.pull_request.base.sha;
		const head = payload.pull_request.head.sha;

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

		if (response.data.files) {
			filesChanged = response.data.files.map((file) => file.filename);
		}
	} else if (eventName === 'push') {
		const payload: PushEvent = github.context.payload as PushEvent;

		core.info(JSON.stringify(payload));

		filesChanged = payload.commits
			.flatMap((commit) => [commit.added, commit.removed, commit.modified])
			.flatMap((commit) => commit)
			.filter((commit) => commit);
	} else {
		return core.setFailed(
			`This action only supports pull requests and pushes, ${github.context.eventName} events are not supported. ` +
				"Please submit an issue on this action's GitHub repo if you believe this in correct.",
		);
	}

	filesChanged.forEach((file) => core.info(`Changed File: ${file}`));

	const matched = filesChanged.filter(pattern);
	matched.forEach((file) => core.info(`Matched: ${file}`));

	core.setOutput('changed', matched.length > 0);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises -- Entry point
run();
