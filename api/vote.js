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
    const MAX_RETRIES = 3; // Maximum attempts to update the file in case of concurrent writes

    if (!GITHUB_TOKEN) {
        return res.status(500).json({ message: 'Server configuration error: GITHUB_TOKEN not set.' });
    }

    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    
    // Retry mechanism for handling concurrent updates (SHA mismatch)
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        let sha = null;
        let votes = {};
        let initialReadError = null;

        // --- 1. Retrieve existing data or initialize if file does not exist ---
        try {
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
            if (error.status === 404) {
                // File does not exist, initialize empty votes. sha remains null for file creation.
                console.log(`Attempt ${attempt}: ${FILE_PATH} not found. Initializing votes object.`);
                votes = {};
                sha = null; 
            } else {
                // Log and store other critical errors (e.g., bad token, network issues)
                console.error(`Attempt ${attempt}: GitHub API retrieval failed:`, error.message);
                initialReadError = error;
                // If read fails for a reason other than 404, we break retries and fail immediately.
                break; 
            }
        }

        if (initialReadError) {
             // If a fatal read error occurred, return 500 immediately.
             return res.status(500).json({ message: 'Failed to retrieve voting data from GitHub on first read.' });
        }
        
        // --- 2. Update the vote count in memory ---
        votes[photo] = (votes[photo] || 0) + 1;
        
        // --- 3. Write the updated data back to GitHub ---
        try {
            const updatedContent = JSON.stringify(votes, null, 2);

            const updateParams = {
                owner: GITHUB_OWNER,
                repo: GITHUB_REPO,
                path: FILE_PATH,
                content: Buffer.from(updatedContent).toString('base64'),
                sha: sha, 
                message: sha 
                    ? `Vote update for ${photo} (Attempt ${attempt})`
                    : `Initial commit: creating ${FILE_PATH} with vote for ${photo} (Attempt ${attempt})` 
            };

            await octokit.rest.repos.createOrUpdateFileContents(updateParams);

            // Success: Return 200 and exit the function/retry loop
            return res.status(200).json({ message: `Vote updated successfully on attempt ${attempt}!` });

        } catch (error) {
            // Check for the specific conflict error (SHA mismatch)
            if (error.status === 409) {
                console.warn(`Attempt ${attempt} failed due to SHA mismatch (409 Conflict). Retrying...`);
                // Continue to the next iteration of the loop to read the latest SHA and content
                continue;
            } else {
                // Handle all other critical write errors
                console.error(`Attempt ${attempt}: GitHub API write failed:`, error.message);
                // Break out of the retry loop, we can't recover from this error
                break;
            }
        }
    }
    
    // If the loop finished without success (i.e., ran out of retries or hit a non-retryable error)
    return res.status(500).json({ 
        message: `Failed to update vote after ${MAX_RETRIES} attempts. Too many concurrent requests or a persistent error occurred.` 
    });
};
