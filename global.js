console.log('IT’S ALIVE!');

// Utility function to select all matching elements
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

// List of pages for the navigation menu
const pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'cv/', title: 'CV/Resume' },
    { url: 'meta/', title: 'Meta'},
    { url: 'https://github.com/hanajuliatj', title: 'Github' }
];

// Check if we are on the home page
const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Create the navigation bar dynamically
const nav = document.createElement('nav');
document.body.prepend(nav);

// Add links to the navigation bar
for (const page of pages) {
    let url = page.url;
    let title = page.title;

    // Adjust URL for relative paths if not on the home page
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;

    // Create a link element
    const a = document.createElement('a');
    a.href = url;           // Set the URL
    a.textContent = title;  // Set the text content

    // Highlight the current page
    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    );

    // Open external links in a new tab
    a.toggleAttribute('target', a.host !== location.host);

    // Add the link to the navigation bar
    nav.append(a);
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <label class="color-scheme">
      Theme:
      <select id="theme-select">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );

// Get references to the <select> element and <html> root element
const themeSelect = document.getElementById('theme-select');
const rootElement = document.documentElement;

// Load the user's saved preference (if any)
const savedTheme = localStorage.getItem('color-scheme');
if (savedTheme) {
  rootElement.style.colorScheme = savedTheme; // Apply saved theme
  themeSelect.value = savedTheme;            // Update the dropdown
}

// Add an event listener for dropdown changes
themeSelect.addEventListener('change', () => {
  const selectedTheme = themeSelect.value;

  // Apply the selected theme to the <html> element
  rootElement.style.colorScheme = selectedTheme;

  // Save the user's preference in localStorage
  localStorage.setItem('color-scheme', selectedTheme);
});


const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;

// Update the "Automatic" option text based on the system preference
const autoOption = themeSelect.querySelector('option[value="light dark"]');
autoOption.textContent = `Automatic (${isDarkMode ? 'Dark' : 'Light'})`;

export async function fetchJSON(url) {
  try {
      // Fetch the JSON file from the given URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
      }
      const data = await response.json();
      return data; 


  } catch (error) {
      console.error('Error fetching or parsing JSON data:', error);
  }
}


export function renderProjects(project, containerElement, headingLevel = "h2") {
  if (!containerElement) {
      console.error("Container element is not provided or invalid.");
      return;
  }

  // Validate heading level to ensure it's an actual heading tag (h1-h6)
  const validHeadings = ["h1", "h2", "h3", "h4", "h5", "h6"];
  if (!validHeadings.includes(headingLevel)) {
      console.warn(`Invalid heading level "${headingLevel}". Defaulting to "h2".`);
      headingLevel = "h2";
  }

  // Create project wrapper
  const projectWrapper = document.createElement("div");
  projectWrapper.classList.add("project-card");

  // Create dynamic heading element
  const titleElement = document.createElement(headingLevel);
  titleElement.textContent = project.title || "Untitled Project";
  projectWrapper.appendChild(titleElement);

  // Create and append description if available
  if (project.description) {
      const descriptionElement = document.createElement("p");
      descriptionElement.textContent = project.description;
      projectWrapper.appendChild(descriptionElement);
  }

  // Create and append image if available
  if (project.imageUrl) {
      const imageElement = document.createElement("img");
      imageElement.src = project.imageUrl;
      imageElement.alt = project.title || "Project Image";
      imageElement.classList.add("project-image");
      projectWrapper.appendChild(imageElement);
  }

  // Append project to container
  containerElement.appendChild(projectWrapper);
}

export async function fetchGitHubData(username) {
  const url = `https://api.github.com/users/${username}`;
  return fetchJSON(url);
}