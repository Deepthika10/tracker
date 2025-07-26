document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addMetricForm = document.getElementById('add-metric-form');
    const metricsGrid = document.getElementById('metrics-grid');
    const modal = document.getElementById('add-data-modal');
    const closeModalButton = document.querySelector('.close-button');
    const addDataForm = document.getElementById('add-data-form');
    const modalTitle = document.getElementById('modal-title');
    const modalMetricIdInput = document.getElementById('modal-metric-id');
    const metricValueInput = document.getElementById('metric-value');
    const metricDateInput = document.getElementById('metric-date');
    
    // NOTE: Add a container for the timeline in your dashboard.html file
    // e.g., <section class="card"><div id="timeline-container"></div></section>
    const timelineContainer = document.getElementById('timeline-container');


    // In-memory store for metrics and charts. We'll load from localStorage.
    let metrics = [];
    let charts = {}; // To hold chart instances

    // --- DATA HANDLING --- //

    /**
     * Loads metrics from local storage.
     */
    function loadMetrics() {
        const storedMetrics = localStorage.getItem('trackedMetrics');
        if (storedMetrics) {
            metrics = JSON.parse(storedMetrics);
        }
    }

    /**
     * Saves metrics to local storage.
     */
    function saveMetrics() {
        localStorage.setItem('trackedMetrics', JSON.stringify(metrics));
    }
    
    /**
     * Deletes a metric by its ID.
     * @param {string} metricId - The ID of the metric to delete.
     */
    function deleteMetric(metricId) {
        // Confirm before deleting
        if (!confirm('Are you sure you want to delete this metric and all its data?')) {
            return;
        }

        // Filter out the metric to be deleted
        metrics = metrics.filter(metric => metric.id !== metricId);
        
        // Clean up the chart instance to prevent memory leaks
        if (charts[metricId]) {
            charts[metricId].destroy();
            delete charts[metricId];
        }

        saveMetrics();
        renderAll();
    }


    // --- UI RENDERING --- //
    
    /**
     * Renders everything: metrics and the timeline.
     */
    function renderAll() {
        renderMetrics();
        renderTimeline();
    }

    /**
     * Renders all metrics to the grid.
     */
    function renderMetrics() {
        metricsGrid.innerHTML = ''; // Clear existing metrics
        metrics.forEach(metric => {
            createMetricCard(metric);
        });
    }

    /**
     * Creates and appends a single metric card to the grid.
     * @param {object} metric - The metric object.
     */
    function createMetricCard(metric) {
        // Create card element
        const card = document.createElement('div');
        card.className = 'card metric-card';
        card.dataset.id = metric.id;

        // Card header
        const header = document.createElement('div');
        header.className = 'metric-card-header';
        
        const title = document.createElement('h3');
        title.textContent = metric.name;

        const buttonsWrapper = document.createElement('div');

        const addButton = document.createElement('button');
        addButton.className = 'btn btn-secondary';
        addButton.textContent = 'Add Data';
        addButton.addEventListener('click', () => openAddDataModal(metric.id));
        
        // Create Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger'; // A new class for styling
        deleteButton.textContent = 'Delete';
        deleteButton.style.marginLeft = '10px';
        deleteButton.addEventListener('click', () => deleteMetric(metric.id));

        buttonsWrapper.appendChild(addButton);
        buttonsWrapper.appendChild(deleteButton);
        header.appendChild(title);
        header.appendChild(buttonsWrapper);

        // Chart container
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        const canvas = document.createElement('canvas');
        chartContainer.appendChild(canvas);

        card.appendChild(header);
        card.appendChild(chartContainer);
        metricsGrid.appendChild(card);

        // Render chart
        renderChart(canvas, metric);
    }
    
    /**
     * Renders a chronological timeline of all data points.
     */
    function renderTimeline() {
        if (!timelineContainer) return;

        timelineContainer.innerHTML = '<h2>Activity Timeline</h2>';
        
        const allDataPoints = [];
        metrics.forEach(metric => {
            metric.data.forEach(point => {
                allDataPoints.push({
                    metricName: metric.name,
                    value: point.value,
                    date: point.date
                });
            });
        });

        // Sort all points by date, most recent first
        allDataPoints.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (allDataPoints.length === 0) {
            timelineContainer.innerHTML += '<p>No data recorded yet. Add some data to a metric to see it here.</p>';
            return;
        }

        const list = document.createElement('ul');
        list.className = 'timeline-list';

        allDataPoints.forEach(point => {
            const listItem = document.createElement('li');
            listItem.className = 'timeline-item';
            listItem.innerHTML = `
                <span class="timeline-date">${point.date}</span>
                <span class="timeline-metric">${point.metricName}</span>
                <span class="timeline-value">${point.value}</span>
            `;
            list.appendChild(listItem);
        });
        
        timelineContainer.appendChild(list);
    }


    /**
     * Renders or updates a chart for a given metric.
     * @param {HTMLCanvasElement} canvas - The canvas element for the chart.
     * @param {object} metric - The metric object with data.
     */
    function renderChart(canvas, metric) {
        const ctx = canvas.getContext('2d');
        
        if (charts[metric.id]) {
            charts[metric.id].destroy();
        }

        const sortedData = metric.data.sort((a, b) => new Date(a.date) - new Date(b.date));

        charts[metric.id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedData.map(d => d.date),
                datasets: [{
                    label: metric.name,
                    data: sortedData.map(d => d.value),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // --- EVENT HANDLERS --- //

    addMetricForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const metricNameInput = document.getElementById('metric-name');
        const metricName = metricNameInput.value.trim();

        if (metricName) {
            const newMetric = {
                id: Date.now().toString(),
                name: metricName,
                data: []
            };
            metrics.push(newMetric);
            saveMetrics();
            renderAll(); // Re-render everything
            metricNameInput.value = '';
        }
    });

    addDataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const metricId = modalMetricIdInput.value;
        const value = parseFloat(metricValueInput.value);
        const date = metricDateInput.value;

        if (metricId && !isNaN(value) && date) {
            const metric = metrics.find(m => m.id === metricId);
            if (metric) {
                metric.data.push({ value, date });
                saveMetrics();
                renderAll(); // Re-render everything
                closeModal();
            }
        }
    });

    // --- MODAL LOGIC --- //

    function openAddDataModal(metricId) {
        const metric = metrics.find(m => m.id === metricId);
        if (metric) {
            modalTitle.textContent = `Add Data for ${metric.name}`;
            modalMetricIdInput.value = metric.id;
            metricDateInput.valueAsDate = new Date();
            metricValueInput.value = '';
            modal.style.display = 'block';
            metricValueInput.focus();
        }
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    closeModalButton.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // --- INITIALIZATION --- //

    function init() {
        loadMetrics();
        renderAll();
    }

    init();
});
