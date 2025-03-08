let data = [];
let commits = [];
let commitProgress = 100;
let timeScale;
let commitMaxTime;
let NUM_ITEMS = 100; // Adjust based on commit history length
let ITEM_HEIGHT = 250; // Height of each commit in the list
let VISIBLE_COUNT = 10; // Number of visible commits at a time

let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;
const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer');
spacer.style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');

let FILE_ITEM_HEIGHT = 150; // Adjust spacing for better readability
let FILE_VISIBLE_COUNT = 8; // Number of visible file entries

let fileTotalHeight = (NUM_ITEMS - 1) * FILE_ITEM_HEIGHT;
const fileScrollContainer = d3.select('#file-scroll-container');
const fileSpacer = d3.select('#file-spacer');
fileSpacer.style('height', `${fileTotalHeight}px`);
const fileItemsContainer = d3.select('#file-items-container');


async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    processCommits(); // Now safe to call

    // Define time scale after commits have been processed
    timeScale = d3.scaleTime()
        .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
        .range([0, 100]);

    commitMaxTime = timeScale.invert(commitProgress);
    scrollContainer.on('scroll', () => {
        const scrollTop = scrollContainer.property('scrollTop');
        let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
        startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
        
        renderItems(startIndex);
    
        // Update floating date label
        if (commits[startIndex]) {
            d3.select('#scroll-date')
              .text(commits[startIndex].datetime.toLocaleDateString());
        }
    });

    fileScrollContainer.on('scroll', () => {
        const scrollTop = fileScrollContainer.property('scrollTop');
        let fileStartIndex = Math.floor(scrollTop / FILE_ITEM_HEIGHT);
        fileStartIndex = Math.max(0, Math.min(fileStartIndex, commits.length - FILE_VISIBLE_COUNT));
        
        renderFileItems(fileStartIndex);
    });
    
    
    

  
    

    filterCommitsByTime();

    createScatterplot();
    displayStats();
    updateFileVisualization(); 
    renderItems(0);
    renderFileItems(0)
}



function displayCommitFiles(filteredCommits) {
    const lines = filteredCommits.flatMap((d) => d.lines);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    let files = d3.groups(lines, (d) => d.file)
        .map(([name, lines]) => ({ name, lines }));

    files = d3.sort(files, (d) => -d.lines.length);

    d3.select('.files').selectAll('div').remove();
    
    let filesContainer = d3.select('.files')
        .selectAll('div')
        .data(files)
        .enter()
        .append('div');

    filesContainer.append('dt')
        .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

    filesContainer.append('dd')
        .selectAll('div')
        .data(d => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', d => fileTypeColors(d.type));
}

function renderItems(startIndex) {
    // Clear previous entries
    itemsContainer.selectAll('div').remove();

    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
    let newCommitSlice = commits.slice(startIndex, endIndex);

    // Update scatterplot to reflect the current commit selection
    updateScatterplot(newCommitSlice);

    // Update file visualization to match current commits
    displayCommitFiles(newCommitSlice);

    // Bind new commits to the container
    itemsContainer.selectAll('div')
        .data(newCommitSlice)
        .enter()
        .append('div')
        .attr('class', 'commit-entry')
        .style('position', 'absolute')
        .style('top', (_, idx) => `${idx * ITEM_HEIGHT}px`)
        .html((commit, index) => `
            <p>
    On ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, 
    I ${index > 0 ? 'pushed another significant update' : 'made my first commit, marking the beginning of this project'}.
    <a href="${commit.url}" target="_blank">
        ${index > 0 ? 'See the details of this commit' : 'Take a look at the very first changes'}
    </a>.
    
    This update involved ${commit.totalLines} lines of code, affecting 
    ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. 

    ${commit.totalLines > 500 ? 
        'It was a massive overhaul, introducing crucial improvements and restructuring key components.' 
        : 'This commit focused on refining existing features, optimizing performance, and fixing minor bugs.'}

    Some of the most impacted files included 
    ${d3.rollups(commit.lines, D => D.length, d => d.file)
        .map(([file]) => `<code>${file}</code>`)
        .slice(0, 3)
        .join(', ')}
    ${d3.rollups(commit.lines, D => D.length, d => d.file).length > 3 ? 'and more.' : '.'}

    Every change, whether big or small, contributes to shaping this project into something better.
</p>

        `);
}

function renderFileItems(fileStartIndex) {
    // Clear previous entries
    fileItemsContainer.selectAll('div').remove();

    const fileEndIndex = Math.min(fileStartIndex + FILE_VISIBLE_COUNT, commits.length);
    let fileCommitSlice = commits.slice(fileStartIndex, fileEndIndex);

    // Update unit visualization for file sizes
    displayCommitFiles(fileCommitSlice);

    // Bind new file entries to the container
    fileItemsContainer.selectAll('div')
        .data(fileCommitSlice)
        .enter()
        .append('div')
        .attr('class', 'file-entry')
        .style('position', 'absolute')
        .style('top', (_, idx) => `${idx * FILE_ITEM_HEIGHT}px`)
        .html((commit, index) => `
            <p>
    On ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, 
    I made an important update, modifying 
    <a href="${commit.url}" target="_blank">${commit.totalLines} lines of code</a> 
    across ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files. 

    This commit ${commit.totalLines > 500 ? 'was a major refactor, introducing significant changes to the codebase' 
    : 'included refinements and optimizations to improve performance and readability'}. 

    It touched files related to 
    ${d3.rollups(commit.lines, D => D.length, d => d.file)
        .map(([file]) => `<code>${file}</code>`)
        .slice(0, 3) // Show up to 3 files
        .join(', ')} 
    ${d3.rollups(commit.lines, D => D.length, d => d.file).length > 3 ? 'and more.' : '.'}

    Every change contributes to making the project more robust, efficient, and maintainable.
</p>

        `);
}



// Function to process commits and group them properly
function processCommits() {
    commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;

        let ret = {
            id: commit,
            url: `https://github.com/hanajuliatj/portfolio/commit/${commit}`,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            configurable: false,
            writable: false,
            enumerable: false,
        });

        return ret;
    });
}

// Function to display statistics
function displayStats() {
    const statsContainer = d3.select('#stats');
    statsContainer.html(''); // Clear existing stats
    const dl = statsContainer.append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(d3.sum(data, d => d.line));

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    const fileCount = d3.groups(data, d => d.file).length;
    dl.append('dt').text('Number of files');
    dl.append('dd').text(fileCount);

    const maxFileLength = d3.max(data, d => d.line);
    dl.append('dt').text('Maximum file length');
    dl.append('dd').text(maxFileLength);

    const averageFileLength = d3.mean(d3.rollups(data, v => d3.max(v, d => d.line), d => d.file), d => d[1]);
    dl.append('dt').text('Average file length');
    dl.append('dd').text(averageFileLength?.toFixed(2) || 'N/A');

    const workByPeriod = d3.rollups(data, v => v.length, d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }));
    const maxPeriod = d3.greatest(workByPeriod, d => d[1])?.[0];
    dl.append('dt').text('Most work done during');
    dl.append('dd').text(maxPeriod || 'Unknown');
}
function filterCommitsByTime() {
    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}


// Function to update the UI when the slider changes
function updateSliderUI() {
    const slider = document.getElementById('commit-slider');
    const selectedTime = document.getElementById('selectedTime');

    slider.addEventListener('input', function () {
        commitProgress = Number(this.value);
        commitMaxTime = timeScale.invert(commitProgress);
        selectedTime.textContent = commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' });

        updateScatterplot();
    });

    // Initialize display
    selectedTime.textContent = commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' });
}

// Function to update the scatterplot based on filtering
function updateScatterplot() {
    d3.selectAll('.dots circle')
        .style('display', d => d.datetime <= commitMaxTime ? 'block' : 'none');
}
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);


function updateFileVisualization() {
    let lines = filteredCommits.flatMap(d => d.lines);

    let files = d3.groups(lines, d => d.file)
        .map(([name, lines]) => ({ name, lines }));

    // Sort files in descending order based on number of lines
    files = d3.sort(files, d => -d.lines.length);

    // Clear existing content before re-rendering
    d3.select('.files').selectAll('div').remove();

    let filesContainer = d3.select('.files')
        .selectAll('div')
        .data(files)
        .enter()
        .append('div');

    // Add filename and total line count
    filesContainer.append('dt')
        .html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

    // Append dd and add a div per line (unit visualization) with color by type
    filesContainer.append('dd')
        .selectAll('div')
        .data(d => d.lines)
        .enter()
        .append('div')
        .attr('class', 'line')
        .style('background', d => fileTypeColors(d.type)); // Apply color based on technology type
}




// Function to create the scatterplot
function createScatterplot() {
    const svg = d3.select('#chart').append('svg')
        .attr('viewBox', `0 0 1000 600`)
        .style('overflow', 'visible');

    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([40, 960])
        .nice();
    
    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([560, 40]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(commits, d => d.totalLines))
        .range([2, 30]);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0, 560)`) // X-axis
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .attr('transform', `translate(40, 0)`) // Y-axis
        .call(d3.axisLeft(yScale).tickFormat(d => `${String(d % 24).padStart(2, '0')}:00`));

    // Add dots for commits
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle')
        .data(commits)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'orange')
        .classed('selected', false);

    updateScatterplot();
}

// Run everything when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
});
