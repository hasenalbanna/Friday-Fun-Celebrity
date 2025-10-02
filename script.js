// Serverless function URL to update votes (You will get this URL after deployment)
const API_URL = 'https://friday-fun-celebrity.vercel.app/api/vote'; 

// Local photo data (used for displaying images and local vote counts)
const photos = [
    { id: 1, file: './img/photo-1.png', votes: 0 },
    { id: 2, file: './img/photo-2.png', votes: 0 },
    { id: 3, file: './img/photo-3.png', votes: 0 },
    { id: 4, file: './img/photo-4.png', votes: 0 },
    { id: 5, file: './img/photo-5.png', votes: 0 },
    { id: 6, file: './img/photo-6.png', votes: 0 },
    { id: 7, file: './img/photo-7.png', votes: 0 },
    { id: 8, file: './img/photo-8.png', votes: 0 },
    { id: 9, file: './img/photo-9.png', votes: 0 },
    { id: 10, file: './img/photo-10.png', votes: 0 },
    { id: 11, file: './img/photo-11.png', votes: 0 },
    { id: 12, file: './img/photo-12.png', votes: 0 },
    { id: 13, file: './img/photo-13.png', votes: 0 },
    { id: 14, file: './img/photo-14.png', votes: 0 },
    { id: 15, file: './img/photo-15.png', votes: 0 },
    { id: 16, file: './img/photo-16.png', votes: 0 },
    { id: 17, file: './img/photo-17.png', votes: 0 },
    { id: 18, file: './img/photo-18.png', votes: 0 },
    { id: 19, file: './img/photo-19.png', votes: 0 },
    { id: 20, file: './img/photo-20.png', votes: 0 },
    { id: 21, file: './img/photo-21.png', votes: 0 },
    { id: 22, file: './img/photo-22.png', votes: 0 },
    { id: 23, file: './img/photo-23.png', votes: 0 },
    { id: 24, file: './img/photo-24.png', votes: 0 },
    { id: 25, file: './img/photo-25.png', votes: 0 },
    { id: 26, file: './img/photo-26.png', votes: 0 },
    { id: 27, file: './img/photo-27.png', votes: 0 },
    { id: 28, file: './img/photo-28.png', votes: 0 },
    { id: 29, file: './img/photo-29.png', votes: 0 },
    { id: 30, file: './img/photo-30.png', votes: 0 },
    { id: 31, file: './img/photo-31.png', votes: 0 },
    { id: 32, file: './img/photo-32.png', votes: 0 }
];

// Game State Variables
let currentPhotos = [];
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

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Load votes from GitHub Pages JSON file
        await loadVotes();
        
        // Set up event listeners
        photo1Container.addEventListener('click', () => {
            handleVote(currentPhotos[0].id, 1);
        });

        photo2Container.addEventListener('click', () => {
            handleVote(currentPhotos[1].id, 2);
        });

        showLeaderboardBtn.addEventListener('click', renderLeaderboard);

        // Start the game
        renderNextRound();
    } catch (error) {
        console.error('Initialization error:', error);
        // If loading votes fails, still let the game work locally
        renderNextRound();
    }
});

// Load votes from GitHub Pages JSON file
async function loadVotes() {
    try {
        const response = await fetch('./votes.json');
        if (!response.ok) {
            throw new Error('Failed to load votes.json');
        }
        const data = await response.json();
        
        for (const photo of photos) {
            const photoKey = `photo-${photo.id}`;
            if (data[photoKey] !== undefined) {
                photo.votes = data[photoKey];
            }
        }
    } catch (error) {
        console.error('Error loading votes:', error);
    }
}

// Update votes by calling the serverless function
async function updateVote(photoId) {
    try {
        const photoKey = `photo-${photoId}`;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ photo: photoKey })
        });

        if (!response.ok) {
            throw new Error('Failed to update vote via serverless function');
        }

        console.log('Vote successfully submitted!');
    } catch (error) {
        console.error('Error updating vote:', error);
    }
}

// Game Functions
function getRandomPhoto(excludeId) {
    const availablePhotos = photos.filter(photo => photo.id !== excludeId);
    return availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
}

function getTwoRandomPhotos() {
    const shuffled = [...photos].sort(() => Math.random() - 0.5);
    return [shuffled[0], shuffled[1]];
}

function selectNewPhotos() {
    currentPhotos = getTwoRandomPhotos();
    photo1Img.src = currentPhotos[0].file;
    photo2Img.src = currentPhotos[1].file;
}

function renderNextRound() {
    roundCount++;
    roundNumberSpan.textContent = roundCount;
    selectNewPhotos();
}

async function handleVote(photoId, position) {
    const votedPhoto = photos.find(p => p.id === photoId);
    if (votedPhoto) {
        // Increment votes locally
        votedPhoto.votes++;
        
        // Asynchronously update vote on the server (doesn't block the game)
        updateVote(photoId);
        
        // Keep the voted photo in its position and get a new opponent
        if (position === 1) {
            currentPhotos[1] = getRandomPhoto(photoId);
            photo2Img.src = currentPhotos[1].file;
        } else {
            currentPhotos[0] = getRandomPhoto(photoId);
            photo1Img.src = currentPhotos[0].file;
        }
        
        roundCount++;
        roundNumberSpan.textContent = roundCount;
    }
}

function renderLeaderboard() {
    // Reload votes to get the most current data before rendering
    loadVotes().then(() => {
        const sortedPhotos = [...photos].sort((a, b) => b.votes - a.votes);
        leaderboardList.innerHTML = '';

        sortedPhotos.forEach((photo, index) => {
            const listItem = document.createElement('li');
            const imgElement = document.createElement('img');
            imgElement.src = photo.file;
            imgElement.alt = `Rank ${index + 1}`;
            imgElement.classList.add('leaderboard-image');

            const textElement = document.createElement('span');
            textElement.textContent = `Rank ${index + 1}: ${photo.votes} votes`;

            listItem.appendChild(imgElement);
            listItem.appendChild(textElement);
            leaderboardList.appendChild(listItem);
        });

        leaderboardContainer.style.display = 'block';
    }).catch(error => {
        console.error('Failed to update leaderboard:', error);
    });
}