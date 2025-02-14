// Step 1: Reading the CSV file and Displaying Summary Stats
let data = [];
let commits = [];

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    processCommits();
    displayStats();
    console.log(commits);
}

function processCommits() {
    commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;

        let ret = {
            id: commit,
            url: `https://github.com/YOUR_REPO/commit/${commit}`,
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

// Step 3: Adding a Tooltip to Scatterplot
const width = 1000;
const height = 600;
const margin = { top: 10, right: 10, bottom: 30, left: 40 };
const usableArea = {
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  left: margin.left,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom,
};

function updateTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  if (!commit || Object.keys(commit).length === 0) return;
  
  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

// Step 5: Fixing Language Breakdown Display
let brushSelection = null;
let xScale, yScale;

function createScatterplot() {
    const svg = d3.select('#chart').append('svg')
        .attr('viewBox', `0 0 1000 600`)
        .style('overflow', 'visible');

    // Create scales
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([40, 960])
        .nice();
    
    yScale = d3.scaleLinear()
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

    // Add brushing behavior
    const brush = d3.brush()
        .on('start brush end', brushed);
    
    svg.append('g')
        .attr('class', 'brush')
        .call(brush);

    function brushed(event) {
        brushSelection = event.selection;
        updateSelection();
        updateSelectionCount();
        updateLanguageBreakdown();
    }

    function updateSelection() {
        d3.selectAll('circle')
            .classed('selected', d => isCommitSelected(d));
    }

    function isCommitSelected(commit) {
        if (!brushSelection) return false;
        const [[x0, y0], [x1, y1]] = brushSelection;
        const x = xScale(commit.datetime);
        const y = yScale(commit.hourFrac);
        return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    }

    function updateSelectionCount() {
        const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
        const countElement = document.getElementById('selection-count');
        if (countElement) {
            countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
        }
    }

    function updateLanguageBreakdown() {
        const container = document.getElementById('language-breakdown');
        if (!container) {
            console.error('Missing #language-breakdown element in HTML.');
            return;
        }

        const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
        if (selectedCommits.length === 0) {
            container.innerHTML = '<p>No commits selected</p>';
            return;
        }

        const lines = selectedCommits.flatMap(d => d.lines);
        if (lines.length === 0) {
            container.innerHTML = '<p>No line data available</p>';
            return;
        }

        const breakdown = d3.rollup(lines, v => v.length, d => d.type);
        container.innerHTML = Array.from(breakdown, ([lang, count]) =>
            `<dt>${lang}</dt><dd>${count} lines (${d3.format('.1%')(count / lines.length)})</dd>`
        ).join('');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createScatterplot();
});
