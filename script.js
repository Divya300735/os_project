/**
 * CPU Scheduling Performance Analyzer
 * Handles UI interactions, algorithm simulation, step-by-step playback, and data visualization
 */

// Global State
let processes = [];
let processColorMap = {};
const colors = ['#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#f1c40f', '#34495e', '#16a085', '#2980b9'];
let colorIndex = 0;

let simulationData = null; 
let comparisonData = null;
let comparisonChartInstance = null;

// DOM Elements
const processTableBody = document.getElementById('processTableBody');
const addProcessBtn = document.getElementById('addProcessBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const algorithmSelect = document.getElementById('algorithm');
const quantumGroup = document.getElementById('quantumGroup');
const timeQuantumInput = document.getElementById('timeQuantum');
const csOverheadInput = document.getElementById('csOverhead');

const simulateBtn = document.getElementById('simulateBtn');
const stepDemoBtn = document.getElementById('stepDemoBtn');
const compareBtn = document.getElementById('compareBtn');

const messageBox = document.getElementById('messageBox');

// Results & Visualization
const resultsContainer = document.getElementById('resultsContainer');
const ganttChart = document.getElementById('ganttChart');
const ganttLabels = document.getElementById('ganttLabels');
const resultTableBody = document.getElementById('resultTableBody');
const explanationText = document.getElementById('explanationText');

// Comparison
const comparisonContainer = document.getElementById('comparisonContainer');
const closeCompareBtn = document.getElementById('closeCompareBtn');
const ganttChartIdeal = document.getElementById('ganttChartIdeal');
const ganttLabelsIdeal = document.getElementById('ganttLabelsIdeal');
const ganttChartReal = document.getElementById('ganttChartReal');
const ganttLabelsReal = document.getElementById('ganttLabelsReal');

// Live/Step-by-Step Status
const liveStatusContainer = document.getElementById('liveStatusContainer');
const currentTimeDisplay = document.getElementById('currentTimeDisplay');
const readyQueueContainer = document.getElementById('readyQueue');
const cpuStatus = document.getElementById('cpuStatus');
const stepControls = document.getElementById('stepControls');
const nextStepBtn = document.getElementById('nextStepBtn');
const autoStepBtn = document.getElementById('autoStepBtn');

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');
let isDarkMode = false;

/* ===========================
   Theme Logic
=========================== */
themeToggleBtn.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeToggleBtn.innerHTML = isDarkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    if(comparisonChartInstance) {
        // Redraw chart to match theme text colors
        renderComparisonChart();
    }
});

/* ===========================
   UI & Input Handling
=========================== */

algorithmSelect.addEventListener('change', (e) => {
    quantumGroup.style.display = e.target.value === 'RR' ? 'flex' : 'none';
});

function showMessage(msg, type = 'error') {
    messageBox.style.display = 'block';
    messageBox.innerHTML = type === 'error' ? `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}` : `<i class="fa-solid fa-circle-check"></i> ${msg}`;
    if(type !== 'error') {
        messageBox.style.backgroundColor = '#d4edda';
        messageBox.style.color = '#155724';
        messageBox.style.borderColor = '#c3e6cb';
    } else {
        messageBox.style.backgroundColor = '';
        messageBox.style.color = '';
        messageBox.style.borderColor = '';
    }
    setTimeout(() => { messageBox.style.display = 'none'; }, 4000);
}

function hideOutputs() {
    resultsContainer.style.display = 'none';
    comparisonContainer.style.display = 'none';
    liveStatusContainer.style.display = 'none';
}

function assignColor(pid) {
    if(!processColorMap[pid]) {
        processColorMap[pid] = colors[colorIndex % colors.length];
        colorIndex++;
    }
    return processColorMap[pid];
}

function addProcessRow(pid = `P${processes.length + 1}`, at = 0, bt = 1, prio = 1) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" value="${pid}" class="pid-input"></td>
        <td><input type="number" min="0" value="${at}" class="at-input"></td>
        <td><input type="number" min="1" value="${bt}" class="bt-input"></td>
        <td><input type="number" min="1" value="${prio}" class="prio-input"></td>
        <td><button class="btn btn-danger-outline btn-sm delete-btn"><i class="fa-solid fa-trash"></i></button></td>
    `;
    
    tr.querySelector('.delete-btn').addEventListener('click', () => {
        tr.remove();
        syncProcessesFromTable();
    });
    
    processTableBody.appendChild(tr);
    
    // Add event listeners to sync data on change
    tr.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('change', syncProcessesFromTable);
    });
    
    syncProcessesFromTable();
}

function syncProcessesFromTable() {
    processes = [];
    const rows = processTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const pid = row.querySelector('.pid-input').value.trim();
        const at = parseInt(row.querySelector('.at-input').value) || 0;
        const bt = parseInt(row.querySelector('.bt-input').value) || 1;
        const prio = parseInt(row.querySelector('.prio-input').value) || 1;
        
        processes.push({
            pid: pid || 'PX',
            at: Math.max(0, at),
            bt: Math.max(1, bt),
            prio: Math.max(1, prio),
            color: assignColor(pid || 'PX')
        });
    });
}

function loadSampleData() {
    processTableBody.innerHTML = '';
    addProcessRow('P1', 0, 5, 2);
    addProcessRow('P2', 1, 3, 1);
    addProcessRow('P3', 2, 8, 4);
    addProcessRow('P4', 3, 6, 3);
    
    algorithmSelect.value = 'RR';
    timeQuantumInput.value = 2;
    csOverheadInput.value = 1;
    quantumGroup.style.display = 'flex';
    
    showMessage("Sample data loaded successfully!", "success");
}

addProcessBtn.addEventListener('click', () => addProcessRow());
loadSampleBtn.addEventListener('click', loadSampleData);
clearAllBtn.addEventListener('click', () => {
    processTableBody.innerHTML = '';
    processes = [];
    hideOutputs();
});

/* ===========================
   Scheduling Algorithms Core
=========================== */

function cloneProcesses() {
    return processes.map(p => ({ ...p, rt: -1, remainingBt: p.bt }));
}

/**
 * Main simulation function for all algorithms
 * Returns { gantt, metrics, procs }
 */
function runSimulation(algo, csTime, reqQuantum) {
    let procs = cloneProcesses();
    let time = 0;
    let completed = 0;
    let n = procs.length;
    let gantt = [];
    let lastPid = null;
    
    // Safety check
    if(n === 0) return null;

    // For metrics
    let totalTat = 0;
    let totalWt = 0;
    let totalRt = 0;
    let totalCsCount = 0;

    let readyQueue = [];
    
    // Helper to add idle time to gantt
    const addIdle = (from, to) => {
        if (from < to) {
            gantt.push({ type: 'idle', pid: null, start: from, end: to });
        }
    };
    
    // Helper to add Context Switch
    const addCS = (current, duration) => {
        if (duration > 0) {
            gantt.push({ type: 'cs', pid: null, start: current, end: current + duration });
            totalCsCount++;
        }
    };

    if (algo === 'FCFS') {
        procs.sort((a, b) => a.at - b.at);
        for(let i=0; i<n; i++) {
            let p = procs[i];
            
            if (time < p.at) {
                addIdle(time, p.at);
                time = p.at;
            }
            
            // Context Switch overhead applies ONLY if we switch from another process to this
            if (lastPid !== null && lastPid !== p.pid) {
                addCS(time, csTime);
                time += csTime;
            }
            
            if (p.rt === -1) p.rt = time - p.at;
            
            gantt.push({ type: 'process', pid: p.pid, start: time, end: time + p.bt, color: p.color });
            time += p.bt;
            
            p.ct = time;
            p.tat = p.ct - p.at;
            p.wt = p.tat - p.bt;
            
            lastPid = p.pid;
            
            totalTat += p.tat;
            totalWt += p.wt;
            totalRt += p.rt;
        }

    } else if (algo === 'SJF' || algo === 'Priority') {
        while(completed < n) {
            let available = procs.filter(p => p.at <= time && p.remainingBt > 0);
            
            if(available.length === 0) {
                // Find next arriving
                let nextArriving = procs.filter(p => p.remainingBt > 0).sort((a,b) => a.at - b.at)[0];
                addIdle(time, nextArriving.at);
                time = nextArriving.at;
                available = procs.filter(p => p.at <= time && p.remainingBt > 0);
            }
            
            if (algo === 'SJF') {
                available.sort((a, b) => {
                    if(a.remainingBt === b.remainingBt) return a.at - b.at;
                    return a.remainingBt - b.remainingBt;
                });
            } else {
                // Priority (Lower number = higher priority)
                available.sort((a, b) => {
                    if(a.prio === b.prio) return a.at - b.at;
                    return a.prio - b.prio;
                });
            }
            
            let p = available[0];
            
            if (lastPid !== null && lastPid !== p.pid) {
                addCS(time, csTime);
                time += csTime;
            }
            
            if (p.rt === -1) p.rt = time - p.at;
            
            gantt.push({ type: 'process', pid: p.pid, start: time, end: time + p.bt, color: p.color });
            time += p.bt;
            
            p.remainingBt = 0;
            p.ct = time;
            p.tat = p.ct - p.at;
            p.wt = p.tat - p.bt;
            
            lastPid = p.pid;
            completed++;
            
            totalTat += p.tat;
            totalWt += p.wt;
            totalRt += p.rt;
        }

    } else if (algo === 'RR') {
        procs.sort((a, b) => a.at - b.at);
        let queue = [];
        let inQueue = new Set();
        let idx = 0;
        
        // Push arriving until current time
        const updateQueue = (currTime) => {
            while (idx < n && procs[idx].at <= currTime) {
                if(!inQueue.has(procs[idx].pid) && procs[idx].remainingBt > 0) {
                    queue.push(procs[idx]);
                    inQueue.add(procs[idx].pid);
                }
                idx++;
            }
        };
        
        // Initial setup
        if(procs[0].at > time) {
            addIdle(time, procs[0].at);
            time = procs[0].at;
        }
        updateQueue(time);
        
        while(completed < n) {
            if(queue.length === 0) {
                if(idx < n) {
                    addIdle(time, procs[idx].at);
                    time = procs[idx].at;
                    updateQueue(time);
                } else break;
            }
            
            let p = queue.shift();
            inQueue.delete(p.pid);
            
            if(lastPid !== null && lastPid !== p.pid) {
                addCS(time, csTime);
                time += csTime;
                updateQueue(time); // More processes might arrive during CS
            }
            
            if(p.rt === -1) p.rt = time - p.at;
            
            let execTime = Math.min(reqQuantum, p.remainingBt);
            gantt.push({ type: 'process', pid: p.pid, start: time, end: time + execTime, color: p.color });
            
            time += execTime;
            p.remainingBt -= execTime;
            lastPid = p.pid;
            
            updateQueue(time);
            
            if(p.remainingBt > 0) {
                queue.push(p);
                inQueue.add(p.pid);
            } else {
                p.ct = time;
                p.tat = p.ct - p.at;
                p.wt = p.tat - p.bt;
                completed++;
                
                totalTat += p.tat;
                totalWt += p.wt;
                totalRt += p.rt;
            }
        }
    }
    
    let makeSpan = time;
    let activeTime = gantt.filter(g => g.type === 'process').reduce((acc, g) => acc + (g.end - g.start), 0);
    
    return {
        gantt,
        procs,
        metrics: {
            avgTat: (totalTat / n).toFixed(2),
            avgWt: (totalWt / n).toFixed(2),
            avgRt: (totalRt / n).toFixed(2),
            cpuUtil: ((activeTime / makeSpan) * 100).toFixed(2),
            throughput: (n / makeSpan).toFixed(4),
            totalCsTime: totalCsCount * csTime,
            csCount: totalCsCount,
            makeSpan: makeSpan
        }
    };
}

/* ===========================
   UI Binding & Triggers
=========================== */

function getInputs() {
    syncProcessesFromTable();
    if(processes.length === 0) {
        showMessage("Please add at least one process.");
        return null;
    }
    const algo = algorithmSelect.value;
    const csTime = parseInt(csOverheadInput.value) || 0;
    const quantum = parseInt(timeQuantumInput.value) || 2;
    
    return { algo, csTime, quantum };
}

simulateBtn.addEventListener('click', () => {
    const inputs = getInputs();
    if(!inputs) return;
    
    hideOutputs();
    simulationData = runSimulation(inputs.algo, inputs.csTime, inputs.quantum);
    renderResultsWrapper(simulationData);
});

compareBtn.addEventListener('click', () => {
    const inputs = getInputs();
    if(!inputs) return;
    
    hideOutputs();
    
    comparisonData = {
        ideal: runSimulation(inputs.algo, 0, inputs.quantum),
        real: runSimulation(inputs.algo, inputs.csTime, inputs.quantum)
    };
    
    renderComparison(comparisonData, inputs.csTime);
});

closeCompareBtn.addEventListener('click', () => {
    comparisonContainer.style.display = 'none';
});

/* ===========================
   Render Results View
=========================== */

function renderResultsWrapper(data) {
    resultsContainer.style.display = 'block';
    
    // 1. Gantt Chart
    renderGanttChart(data.gantt, 'ganttChart', 'ganttLabels');
    
    // 2. Metrics
    document.getElementById('avgTat').innerText = data.metrics.avgTat;
    document.getElementById('avgWt').innerText = data.metrics.avgWt;
    document.getElementById('avgRt').innerText = data.metrics.avgRt;
    document.getElementById('cpuUtil').innerText = `${data.metrics.cpuUtil}%`;
    document.getElementById('throughput').innerText = data.metrics.throughput;
    document.getElementById('totalCsTime').innerText = data.metrics.totalCsTime;
    document.getElementById('totalCsCount').innerText = data.metrics.csCount;
    
    // 3. Table
    resultTableBody.innerHTML = '';
    data.procs.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color:${p.color}">${p.pid}</strong></td>
            <td>${p.at}</td>
            <td>${p.bt}</td>
            <td>${p.ct}</td>
            <td>${p.tat}</td>
            <td>${p.wt}</td>
            <td>${p.rt}</td>
        `;
        resultTableBody.appendChild(tr);
    });
    
    // 4. Explanation
    generateExplanation(data, document.getElementById('explanationText'), algorithmSelect.value, csOverheadInput.value);
}

function renderGanttChart(gantt, chartId, labelsId, overrideMaxTime = null) {
    const chart = document.getElementById(chartId);
    const labels = document.getElementById(labelsId);
    chart.innerHTML = '';
    labels.innerHTML = '';
    
    if(!gantt || gantt.length === 0) return;
    
    const maxTime = overrideMaxTime !== null ? overrideMaxTime : gantt[gantt.length - 1].end;
    if(maxTime === 0) return;
    
    gantt.forEach(block => {
        const width = ((block.end - block.start) / maxTime) * 100;
        const blockDiv = document.createElement('div');
        blockDiv.className = `gantt-block`;
        blockDiv.style.width = `${width}%`;
        
        if (block.type === 'process') {
            blockDiv.style.backgroundColor = block.color;
            blockDiv.innerText = block.pid;
            blockDiv.title = `${block.pid} [${block.start} - ${block.end}]`;
        } else if (block.type === 'cs') {
            blockDiv.style.backgroundColor = 'var(--cs-color)';
            blockDiv.innerText = 'CS';
            blockDiv.title = `Context Switch [${block.start} - ${block.end}]`;
        } else {
            blockDiv.style.backgroundColor = 'var(--idle-color)';
            blockDiv.innerText = 'IDLE';
            blockDiv.title = `CPU Idle [${block.start} - ${block.end}]`;
        }
        
        chart.appendChild(blockDiv);
    });
    
    // Add time labels
    let timePoints = new Set([0]);
    gantt.forEach(g => {
        timePoints.add(g.start);
        timePoints.add(g.end);
    });
    
    Array.from(timePoints).sort((a,b)=>a-b).forEach(t => {
        const label = document.createElement('span');
        label.className = 'gantt-label';
        label.innerText = t;
        label.style.left = `${(t / maxTime) * 100}%`;
        labels.appendChild(label);
    });
}

function generateExplanation(data, textElement, algoName, overhead) {
    const isRR = algoName === 'RR';
    const overheadVal = parseInt(overhead);
    
    let exp = `This simulation utilized the <strong>${algoSelectLabel(algoName)}</strong> algorithm. `;
    
    if (overheadVal > 0) {
        exp += `By accounting for realistic hardware constraints, a Context Switching overhead of <strong>${overheadVal} unit(s)</strong> was added between distinct process executions. `;
        if(data.metrics.csCount > 0) {
            exp += `This occurred <strong>${data.metrics.csCount} times</strong>, cumulatively consuming <strong>${data.metrics.totalCsTime} units</strong> of CPU time purely on administrative tasks. `;
        }
    } else {
        exp += `This is an ideal simulation with 0 context switching overhead. `;
    }
    
    if (isRR && data.metrics.csCount > processes.length) {
        exp += `Notice that because Round Robin forcibly pre-empts processes after the Time Quantum expires, the number of context switches is significantly higher compared to non-preemptive algorithms, negatively affecting throughput and total turnaround time when CS overhead is high.`;
    } else if (data.metrics.cpuUtil < 95) {
        exp += `CPU Utilization is at <strong>${data.metrics.cpuUtil}%</strong>, which indicates noticeable idle periods either due to late arriving processes or significant context switching overhead.`;
    } else {
        exp += `Throughput is <strong>${data.metrics.throughput}</strong> processes per unit time. Overall CPU utilization was highly efficient at <strong>${data.metrics.cpuUtil}%</strong>.`;
    }
    
    textElement.innerHTML = exp;
}

function algoSelectLabel(val) {
    const sel = document.getElementById('algorithm');
    return sel.options[sel.selectedIndex].text;
}

/* ===========================
   Render Comparison View
=========================== */

function renderComparison(data, csTime) {
    comparisonContainer.style.display = 'block';
    
    renderGanttChart(data.ideal.gantt, 'ganttChartIdeal', 'ganttLabelsIdeal');
    renderGanttChart(data.real.gantt, 'ganttChartReal', 'ganttLabelsReal');
    
    document.getElementById('statsIdeal').innerHTML = `
        <li><span>Avg Turnaround Time:</span> <span class="val">${data.ideal.metrics.avgTat}</span></li>
        <li><span>Avg Waiting Time:</span> <span class="val">${data.ideal.metrics.avgWt}</span></li>
        <li><span>Makespan (Total Time):</span> <span class="val">${data.ideal.metrics.makeSpan}</span></li>
        <li><span>CPU Utilization:</span> <span class="val">${data.ideal.metrics.cpuUtil}%</span></li>
        <li><span>Total Overhead:</span> <span class="val">0 (Ideal)</span></li>
    `;
    
    document.getElementById('statsReal').innerHTML = `
        <li><span>Avg Turnaround Time:</span> <span class="val">${data.real.metrics.avgTat}</span></li>
        <li><span>Avg Waiting Time:</span> <span class="val">${data.real.metrics.avgWt}</span></li>
        <li><span>Makespan (Total Time):</span> <span class="val">${data.real.metrics.makeSpan}</span></li>
        <li><span>CPU Utilization:</span> <span class="val">${data.real.metrics.cpuUtil}%</span></li>
        <li><span>Total Overhead:</span> <span class="val">${data.real.metrics.totalCsTime} (CS=${csTime})</span></li>
    `;
    
    generateCompareExplanation(data.ideal, data.real);
    renderComparisonChart();
}

function renderComparisonChart() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (comparisonChartInstance) {
        comparisonChartInstance.destroy();
    }
    
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e0e0e0' : '#333333';
    
    comparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Avg Turnaround Time', 'Avg Waiting Time', 'Total Makespan', 'Total CS Time'],
            datasets: [
                {
                    label: 'Ideal (No CS)',
                    data: [comparisonData.ideal.metrics.avgTat, comparisonData.ideal.metrics.avgWt, comparisonData.ideal.metrics.makeSpan, 0],
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Realistic (With CS)',
                    data: [comparisonData.real.metrics.avgTat, comparisonData.real.metrics.avgWt, comparisonData.real.metrics.makeSpan, comparisonData.real.metrics.totalCsTime],
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: textColor } },
                title: {
                    display: true,
                    text: 'Performance Metric Comparison',
                    color: textColor
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                }
            }
        }
    });
}

function generateCompareExplanation(ideal, real) {
    const pContainer = document.getElementById('compareExplanationText');
    const diffTat = (real.metrics.avgTat - ideal.metrics.avgTat).toFixed(2);
    const diffTime = real.metrics.makeSpan - ideal.metrics.makeSpan;
    
    pContainer.innerHTML = `
        By introducing context switching overhead, the average turnaround time increased by <strong>${diffTat} units</strong>, and the total execution time (makespan) extended by <strong>${diffTime} units</strong>. CPU utilization dropped from <strong>${ideal.metrics.cpuUtil}%</strong> to <strong>${real.metrics.cpuUtil}%</strong> because the processor was busy swapping states instead of executing instruction bursts. This clearly visualizes the theoretical vs realistic gap in CPU scheduling analysis.
    `;
}

/* ===========================
   Step by Step Demo Logic
=========================== */

let stepInterval = null;
let currentTimelinePoint = 0;
let liveGantt = [];

stepDemoBtn.addEventListener('click', () => {
    const inputs = getInputs();
    if(!inputs) return;
    
    hideOutputs();
    liveStatusContainer.style.display = 'block';
    stepControls.style.display = 'flex';
    
    simulationData = runSimulation(inputs.algo, inputs.csTime, inputs.quantum);
    liveGantt = [];
    currentTimelinePoint = 0;
    
    const maxTime = simulationData.gantt.length > 0 ? simulationData.gantt[simulationData.gantt.length-1].end : 0;
    
    // Clear live gantt chart before starting
    document.getElementById('liveGanttChart').innerHTML = '';
    document.getElementById('liveGanttLabels').innerHTML = '';

    for(let t=0; t<maxTime; t++) {
        let block = simulationData.gantt.find(g => t >= g.start && t < g.end);
        liveGantt.push({
            time: t,
            type: block ? block.type : 'idle',
            pid: block ? block.pid : null,
            color: block ? block.color : null
        });
    }
    
    // Add end tick
    liveGantt.push({
        time: maxTime,
        type: 'done',
        pid: null
    });

    renderTick(0);
});

function renderTick(tickIndex) {
    if (tickIndex >= liveGantt.length) {
        clearInterval(stepInterval);
        cpuStatus.className = 'cpu-block idle';
        cpuStatus.innerText = 'DONE';
        cpuStatus.style.backgroundColor = 'var(--success-color)';
        setTimeout(() => {
            renderResultsWrapper(simulationData);
        }, 1000);
        return;
    }

    const state = liveGantt[tickIndex];
    currentTimeDisplay.innerText = state.time;
    
    if(state.type === 'process') {
        cpuStatus.className = 'cpu-block';
        cpuStatus.innerText = state.pid;
        cpuStatus.style.backgroundColor = state.color;
    } else if (state.type === 'cs') {
        cpuStatus.className = 'cpu-block cs';
        cpuStatus.innerText = 'CS Overhead';
        cpuStatus.style.backgroundColor = '';
    } else if (state.type === 'idle' || state.type === 'done') {
        cpuStatus.className = 'cpu-block idle';
        cpuStatus.innerText = 'IDLE';
        cpuStatus.style.backgroundColor = '';
    }

    // --- Build Partial Gantt Chart ---
    const maxTime = simulationData.gantt.length > 0 ? simulationData.gantt[simulationData.gantt.length-1].end : 0;
    
    // Reconstruct gantt up to current tick
    let partialGantt = [];
    for (let block of simulationData.gantt) {
        if (block.start < state.time) {
            let pBlock = { ...block };
            if (pBlock.end > state.time) {
                pBlock.end = state.time; // clip to current time
            }
            partialGantt.push(pBlock);
        }
    }
    
    if (state.type !== 'done' && state.time < maxTime) {
        // Add the currently animating 1-tick block
        let lastPartial = partialGantt[partialGantt.length - 1];
        if (lastPartial && lastPartial.type === state.type && lastPartial.pid === state.pid && lastPartial.end === state.time) {
            lastPartial.end = state.time + 1;
        } else {
            partialGantt.push({
                type: state.type,
                pid: state.pid,
                color: state.color,
                start: state.time,
                end: state.time + 1
            });
        }
    }
    
    renderGanttChart(partialGantt, 'liveGanttChart', 'liveGanttLabels', maxTime);

    // Refresh ready queue visually
    refreshLiveQueue(state.time, state.pid, state.type);
    currentTimelinePoint = tickIndex;
}

function refreshLiveQueue(currentTime, activePid, type) {
    readyQueueContainer.innerHTML = '';
    
    // Find processes arrived but not fully completed
    let arrived = simulationData.procs.filter(p => p.at <= currentTime && p.ct > currentTime);
    
    // Sort or filter if needed based on algorithm, for simple visual:
    // Exclude the one currently in CPU if it's processing
    if (type === 'process') {
        arrived = arrived.filter(p => p.pid !== activePid);
    }
    
    if(arrived.length === 0) {
        readyQueueContainer.innerHTML = '<span style="color:var(--text-muted)">Empty</span>';
        return;
    }
    
    arrived.forEach(p => {
        const d = document.createElement('div');
        d.className = 'queue-item';
        d.style.backgroundColor = p.color;
        d.innerText = p.pid;
        readyQueueContainer.appendChild(d);
    });
}

nextStepBtn.addEventListener('click', () => {
    if(stepInterval) {
        clearInterval(stepInterval);
        stepInterval = null;
        autoStepBtn.innerHTML = '<i class="fa-solid fa-robot"></i> Auto Play';
    }
    renderTick(currentTimelinePoint + 1);
});

autoStepBtn.addEventListener('click', () => {
    if(stepInterval) {
        clearInterval(stepInterval);
        stepInterval = null;
        autoStepBtn.innerHTML = '<i class="fa-solid fa-robot"></i> Auto Play';
    } else {
        autoStepBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        stepInterval = setInterval(() => {
            renderTick(currentTimelinePoint + 1);
        }, 800);
    }
});

/* ===========================
   Init
=========================== */
// Setup Initial rows
addProcessRow('P1', 0, 5, 2);
addProcessRow('P2', 1, 3, 1);
addProcessRow('P3', 2, 8, 4);
