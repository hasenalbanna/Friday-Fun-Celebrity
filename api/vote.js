import { Octokit } from '@octokit/rest';

// This Vercel serverless function handles POST requests to update the vote count
export default async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { photo } = req.body;
    if (!photo) {
        return res.status(400).json({ message: 'Missing photo data in request body' });
    }

    // Configuration for GitHub access
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Ensure this is set in Vercel environment variables
    const GITHUB_OWNER = 'hasenalbanna'; 
    const GITHUB_REPO = 'Friday-Fun-Celebrity'; 
    const FILE_PATH = 'votes.json';

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: GITHUB_TOKEN not set.' });
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    let sha = null;
    let votes = {};

    // --- Step 1: Retrieve existing data or initialize if file does not exist ---
    try {
        // Attempt to fetch the current content of votes.json
        const { data } = await octokit.rest.repos.getContent({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH
        });
        
        // File exists: parse content and store SHA for update
        sha = data.sha;
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        votes = JSON.parse(content);

    } catch (error) {
        // Check if the error is specifically due to the file not being found (HTTP 404)
        if (error.status === 404) {
            console.log(`${FILE_PATH} not found. Initializing votes object.`);
            // File does not exist, so initialize empty votes and keep sha as null for creation
            votes = {};
            sha = null; 
        } else {
            // Handle other critical errors (e.g., bad token, network issues)
            console.error('GitHub API retrieval error:', error.message);
            return res.status(500).json({ message: 'Failed to retrieve voting data from GitHub.' });
        }
    }
    
    // --- Step 2: Update the vote count in memory ---
    votes[photo] = (votes[photo] || 0) + 1;
    
    // --- Step 3: Write the updated data back to GitHub ---
    try {
        const updatedContent = JSON.stringify(votes, null, 2);

        const updateParams = {
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            path: FILE_PATH,
            content: Buffer.from(updatedContent).toString('base64'),
            // If SHA is present, it's an update. If SHA is missing, it's a creation.
            sha: sha, 
            message: sha 
                ? `Updated vote for ${photo}`
                : `Initial commit: creating ${FILE_PATH} with vote for ${photo}` 
        };

        await octokit.rest.repos.createOrUpdateFileContents(updateParams);

        res.status(200).json({ message: 'Vote updated successfully!' });

    } catch (error) {
        console.error('GitHub API update/create error:', error.message);
        res.status(500).json({ message: 'Failed to write updated vote data to GitHub.' });
    }
};
