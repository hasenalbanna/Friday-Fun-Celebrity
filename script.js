// Serverless function URL to update votes (You will get this URL after deployment)
const API_URL = 'YOUR_SERVERLESS_FUNCTION_URL_HERE';

// Celebrity Data (update this with your celebrity photos)
const celebrities = [
    { id: 1, file: './img/celeb-1.png', votes: 0, name: 'Celebrity 1' },
    { id: 2, file: './img/celeb-2.png', votes: 0, name: 'Celebrity 2' },
    // Add all your celebrity data here
];

let currentCelebrities = [];
let roundCount = 0;

// DOM Elements
const photo1Img = document.getElementById('photo-1-img');
const photo2Img = document.getElementById('photo-2-img');
const photo1Container = document.getElementById('photo-1-container');
const photo2Container = document.getElementById('photo-2-container');
const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
const leaderboardContainer = document.getElementById('leaderboard-container');
const leaderboardList = document.getElementById('leaderboard-list');
const roundNumberSpan = document.getElementById('round-number');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadVotes();
        
        photo1Container.addEventListener('click', () => handleVote(currentCelebrities[0].id));
        photo2Container.addEventListener('click', () => handleVote(currentCelebrities[1].id));
        showLeaderboardBtn.addEventListener('click', renderLeaderboard);

        renderNextRound();
    } catch (error) {
        console.error('Initialization error:', error);
        renderNextRound();
    }
});

async function loadVotes() {
    try {
        const response = await fetch('./votes.json');
        if (!response.ok) throw new Error('Failed to load votes.json');
        const data = await response.json();
        
        celebrities.forEach(celeb => {
            const celebKey = `celeb-${celeb.id}`;
            if (data[celebKey] !== undefined) {
                celeb.votes = data[celebKey];
            }
        });
    } catch (error) {
        console.error('Error loading votes:', error);
    }
}

async function updateVote(celebId) {
    try {
        const celebKey = `celeb-${celebId}`;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ celebrity: celebKey })
        });

        if (!response.ok) throw new Error('Failed to update vote via serverless function');
        console.log('Vote successfully submitted!');
    } catch (error) {
        console.error('Error updating vote:', error);
    }
}

function getRandomCelebrities() {
    const shuffled = [...celebrities].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
}

function renderNextRound() {
    roundCount++;
    roundNumberSpan.textContent = roundCount;
    currentCelebrities = getRandomCelebrities();
    photo1Img.src = currentCelebrities[0].file;
    photo2Img.src = currentCelebrities[1].file;
}

async function handleVote(celebId) {
    const votedCeleb = celebrities.find(c => c.id === celebId);
    if (votedCeleb) {
        votedCeleb.votes++;
        updateVote(celebId);
        renderNextRound();
    }
}

function renderLeaderboard() {
    loadVotes().then(() => {
        const sortedCelebrities = [...celebrities].sort((a, b) => b.votes - a.votes);
        leaderboardList.innerHTML = '';

        sortedCelebrities.forEach((celeb, index) => {
            const listItem = document.createElement('li');
            const imgElement = document.createElement('img');
            imgElement.src = celeb.file;
            imgElement.alt = celeb.name;
            imgElement.classList.add('leaderboard-image');

            const textElement = document.createElement('span');
            textElement.textContent = `Rank ${index + 1}: ${celeb.name} - ${celeb.votes} votes`;

            listItem.appendChild(imgElement);
            listItem.appendChild(textElement);
            leaderboardList.appendChild(listItem);
        });

        leaderboardContainer.style.display = 'block';
    }).catch(error => {
        console.error('Failed to update leaderboard:', error);
    });
}