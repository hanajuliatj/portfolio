import { fetchJSON, renderProjects } from "../global.js";

async function loadProjects() {
    try {
        const projects = await fetchJSON("../lib/projects.json");
        const projectsContainer = document.querySelector(".projects");
        const projectsTitle = document.querySelector(".projects-title");

        if (!projectsContainer) {
            console.error("Projects container not found.");
            return;
        }

        // Update project count dynamically
        if (projectsTitle) {
            projectsTitle.textContent = `Projects (${projects.length})`;
        }

        if (!projects || projects.length === 0) {
            projectsContainer.innerHTML = "<p>No projects available.</p>";
            return;
        }

        projects.forEach(project => {
            renderProjects(project, projectsContainer, "h2");
        });
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

loadProjects();
