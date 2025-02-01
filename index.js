import { fetchJSON, renderProjects } from "./global.js";

async function loadLatestProjects() {
    try {
        // Fetch all projects from JSON
        const projects = await fetchJSON("./lib/projects.json");

        // Check if data was successfully fetched
        if (!projects || projects.length === 0) {
            console.warn("No projects found in projects.json");
            return;
        }

        // Select only the first 3 projects
        const latestProjects = projects.slice(0, 3);

        // Select the container in index.html where projects will be displayed
        const projectsContainer = document.querySelector(".projects");

        if (!projectsContainer) {
            console.error("Projects container not found in index.html");
            return;
        }

        // Clear existing content to prevent duplicate rendering
        projectsContainer.innerHTML = "";

        // Render each of the latest 3 projects inside the container
        latestProjects.forEach(project => {
            renderProjects(project, projectsContainer, "h2");
        });

    } catch (error) {
        console.error("Error loading latest projects:", error);
    }
}

// Execute the function when the page loads
loadLatestProjects();

import { fetchGitHubData } from "./global.js";

async function displayGitHubStats() {
    try {
        const githubUsername = "hanajuliatj";  // Replace with your GitHub username
        const githubData = await fetchGitHubData(githubUsername);

  
        // Select the container where data will be displayed
        const githubContainer = document.querySelector(".github-stats");

        if (!githubContainer) {
            console.error("GitHub stats container not found in index.html");
            return;
        }

        // Display GitHub stats dynamically
        githubContainer.innerHTML = `
            <p><strong>Followers:</strong> ${githubData.followers}</p>
            <p><strong>Following:</strong> ${githubData.following}</p>
            <p><strong>Public Repos:</strong> ${githubData.public_repos}</p>
            <p><strong>Public Gists:</strong> ${githubData.public_gists}</p>
            <img src="${githubData.avatar_url}" alt="${githubData.name}" width="100">
        `;
    } catch (error) {
        console.error("Error fetching GitHub data:", error);
    }
}

// Call the function to load GitHub stats
displayGitHubStats();


