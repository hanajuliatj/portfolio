import { fetchJSON, renderProjects } from "../global.js";

// Declare global variables
let projects = [];
let projectsContainer; // Declare projectsContainer globally

async function loadProjects() {
    try {
        projects = await fetchJSON("../lib/projects.json"); // Fetch project data
        projectsContainer = document.querySelector(".projects"); // Assign projectsContainer

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

        // Render all projects
        projects.forEach(project => {
            renderProjects(project, projectsContainer, "h2");
        });

        // Render initial pie chart
        renderPieChart(projects);
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

// Ensure projects are loaded when the DOM is ready
document.addEventListener("DOMContentLoaded", loadProjects);

// Import D3
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

// Select the SVG element
const svg = d3.select("#projects-pie-plot");

// Define an arc generator
const arcGenerator = d3.arc()
    .innerRadius(0) // Full pie slice (no hole in the center)
    .outerRadius(50); // Radius of the pie chart

// SEARCH FUNCTION (FIXED)
let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase(); // Convert query to lowercase

    if (!projects || projects.length === 0) return; // Ensure projects is defined
    if (!projectsContainer) projectsContainer = document.querySelector(".projects"); // Ensure projectsContainer is selected

    // Filter projects based on search query
    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query);
    });

    // Re-render projects and update visualization
    renderProjects(filteredProjects, projectsContainer, "h2");
    renderPieChart(filteredProjects);  // Update pie chart with search results
});

// FUNCTION TO RENDER PIE CHART (FIXED)
function renderPieChart(projectsGiven) {
    if (!projectsGiven || projectsGiven.length === 0) return; // Ensure valid input

    // Group projects by year and count occurrences
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length, // Count projects per year
        (d) => d.year // Group by project year
    );

    // Convert grouped data into the correct format
    let newData = newRolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    // Generate colors using D3's built-in color schemes
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    // Clear previous pie chart & legend before re-rendering
    d3.select("#projects-pie-plot").selectAll("*").remove();
    d3.select(".legend").selectAll("*").remove();

    // Select SVG element
    const svg = d3.select("#projects-pie-plot");

    // Generate pie chart slices
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(newData);
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

    // Append new paths for each slice
    arcData.forEach((d, idx) => {
        svg.append("path")
            .attr("d", arcGenerator(d))
            .attr("fill", colors(idx));
    });

    // Generate updated legend
    let legend = d3.select(".legend");
    newData.forEach((d, idx) => {
        legend.append("li")
            .attr("style", `--color:${colors(idx)}`)
            .attr("class", "legend-item")
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
}
