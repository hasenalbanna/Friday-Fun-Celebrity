import { Octokit } from '@octokit/rest';

export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { photo } = req.body;
    if (!photo) {
        return res.status(400).json({ message: 'Missing photo data' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = 'hasenalbanna'; // Replace with your GitHub username
    const GITHUB_REPO = 'Friday-Fun-Celebrity'; // Replace with your new repo name
    const FILE_PATH = 'votes.json';

    const octokit = new Octokit({ auth: GITHUB_TOKEN });

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const votes = JSON.parse(content);
        
        if (votes[photo] !== undefined) {
            votes[photo] = (votes[photo] || 0) + 1;
        } else {
            votes[photo] = 1; 
        }
        
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