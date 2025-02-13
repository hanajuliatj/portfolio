let data = [];

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // Convert string to number
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone), // Parse date
        datetime: new Date(row.datetime),
    }));

    // Display stats after loading data
    displayStats();
}

// Function to display summary statistics
function displayStats() {
    if (!data.length) return;

    let totalLines = d3.sum(data, d => d.line);
    let totalFiles = data.length; // Assuming each row represents a file

    // Create summary text
    let summaryHTML = `
        <p><strong>Total Lines of Code:</strong> ${totalLines.toLocaleString()}</p>
        <p><strong>Total Files:</strong> ${totalFiles}</p>
    `;

    // Append to the #stats div
    document.getElementById("stats").innerHTML = summaryHTML;
}

// Load data when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});