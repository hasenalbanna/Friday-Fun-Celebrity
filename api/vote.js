import { Octokit } from '@octokit/rest';

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { photo } = req.body;
    if (!photo) {
        return res.status(400).json({ message: 'Missing photo data' });
    }

    // Replace with your GitHub details
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Get this from environment variables
    const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';
    const GITHUB_REPO = 'YOUR_REPO_NAME';
    const FILE_PATH = 'votes.json';

    const octokit = new Octokit({
        auth: GITHUB_TOKEN
    });

    try {
        // 1. Get the current votes.json file
        const { data } = await octokit.rest.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const votes = JSON.parse(content);
        
        // 2. Update the vote count for the voted photo
        if (votes[photo] !== undefined) {
            votes[photo] = (votes[photo] || 0) + 1;
        } else {
            return res.status(400).json({ message: 'Invalid photo ID' });
        }
        
        // 3. Commit the updated file back to GitHub
        const updatedContent = JSON.stringify(votes, null, 2);
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            message: `Updated vote for ${photo}`,
            content: Buffer.from(updatedContent).toString('base64'),
            sha: data.sha
        });

        res.status(200).json({ message: 'Vote updated successfully!' });

    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ message: 'Failed to update vote' });
    }
};