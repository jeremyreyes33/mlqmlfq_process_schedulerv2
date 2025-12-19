const form = document.getElementById('simulatorForm');
const queueConfigsDiv = document.getElementById('queueConfigs');
const processInputsDiv = document.getElementById('processInputs');
const outputDiv = document.getElementById('output');
const numQueuesInput = document.getElementById('numQueues');
const numProcessesInput = document.getElementById('numProcesses');

// Dynamically generate queue config inputs
function generateQueueConfigs(numQueues) {
    if (numQueues === 0) {
        queueConfigsDiv.innerHTML = '';
        return;
    }
    
    let html = '<div class="section-title">🏗️ Queue Configuration</div><div class="config-grid">';
    
    for (let i = 0; i < numQueues; i++) {
        html += `
            <div class="queue-config">
                <h3>Queue ${i + 1}</h3>
                <div class="config-row">
                    <div class="form-group">
                        <label for="queueAlgo${i}">Algorithm</label>
                        <select id="queueAlgo${i}" required>
                            <option value="FCFS">FCFS</option>
                            <option value="SJF">SJF</option>
                            <option value="SRTF">SRTF</option>
                            <option value="Priority">Priority</option>
                            <option value="RR">Round Robin</option>
                        </select>
                    </div>
                    <div id="quantumDiv${i}" class="form-group" style="display: none;">
                        <label for="quantum${i}">Quantum</label>
                        <input type="number" id="quantum${i}" min="1" value="2">
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    queueConfigsDiv.innerHTML = html;
    
    // Add event listeners
    for (let i = 0; i < numQueues; i++) {
        const algoSelect = document.getElementById(`queueAlgo${i}`);
        algoSelect.addEventListener('change', () => {
            document.getElementById(`quantumDiv${i}`).style.display = algoSelect.value === 'RR' ? 'block' : 'none';
        });
    }
}

// Dynamically generate process inputs
function generateProcessInputs(numProcesses, schedulerType, numQueues) {
    if (numProcesses === 0) {
        processInputsDiv.innerHTML = '';
        return;
    }
    
    let html = '<div class="section-title">⚙️ Process Configuration</div><div class="config-grid">';
    
    for (let i = 0; i < numProcesses; i++) {
        let queueInput = '';
        if (schedulerType === 'MLQ' && numQueues > 0) {
            queueInput = `
                <div class="form-group">
                    <label for="processQueue${i}">Queue</label>
                    <input type="number" id="processQueue${i}" min="1" max="${numQueues}" required>
                </div>
            `;
        }
        
        html += `
            <div class="process-config">
                <h3>P${i + 1}</h3>
                <div class="config-row">
                    <div class="form-group">
                        <label for="arrival${i}">Arrival</label>
                        <input type="number" id="arrival${i}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="burst${i}">Burst</label>
                        <input type="number" id="burst${i}" min="1" required>
                    </div>
                    <div class="form-group">
                        <label for="priority${i}">Priority</label>
                        <input type="number" id="priority${i}" min="0" max="99" required>
                    </div>
                    ${queueInput}
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    processInputsDiv.innerHTML = html;
}

// Event listeners for dynamic inputs
numQueuesInput.addEventListener('change', () => {
    const numQueues = parseInt(numQueuesInput.value);
    generateQueueConfigs(numQueues);
    const schedulerType = document.getElementById('schedulerType').value;
    const numProcesses = parseInt(numProcessesInput.value);
    generateProcessInputs(numProcesses, schedulerType, numQueues);
});

numProcessesInput.addEventListener('change', () => {
    const numProcesses = parseInt(numProcessesInput.value);
    const schedulerType = document.getElementById('schedulerType').value;
    const numQueues = parseInt(numQueuesInput.value);
    generateProcessInputs(numProcesses, schedulerType, numQueues);
});

document.getElementById('schedulerType').addEventListener('change', () => {
    const schedulerType = document.getElementById('schedulerType').value;
    const numQueues = parseInt(numQueuesInput.value);
    const numProcesses = parseInt(numProcessesInput.value);
    generateProcessInputs(numProcesses, schedulerType, numQueues);
});

// Initial generation
generateQueueConfigs(parseInt(numQueuesInput.value));
generateProcessInputs(parseInt(numProcessesInput.value), document.getElementById('schedulerType').value, parseInt(numQueuesInput.value));

// Form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const schedulerType = document.getElementById('schedulerType').value;
    const numQueues = parseInt(numQueuesInput.value);
    const numProcesses = parseInt(numProcessesInput.value);

    // Validate queue assignments for MLQ
    if (schedulerType === 'MLQ' && numQueues > 0) {
        for (let i = 0; i < numProcesses; i++) {
            const queueInput = document.getElementById(`processQueue${i}`);
            if (queueInput) {
                const queueValue = parseInt(queueInput.value);
                if (queueValue > numQueues) {
                    alert(`Process P${i + 1} queue assignment (${queueValue}) exceeds number of queues (${numQueues})`);
                    return;
                }
            }
        }
    }

    // Collect queue configs
    const queues = [];
    for (let i = 0; i < numQueues; i++) {
        const algo = document.getElementById(`queueAlgo${i}`).value;
        const quantum = algo === 'RR' ? parseInt(document.getElementById(`quantum${i}`).value) : null;
        queues.push({ algo, quantum, processes: [] });
    }

    // Collect processes
    const processes = [];
    for (let i = 0; i < numProcesses; i++) {
        const arrival = parseInt(document.getElementById(`arrival${i}`).value);
        const burst = parseInt(document.getElementById(`burst${i}`).value);
        const priority = parseInt(document.getElementById(`priority${i}`).value);
        let initialQueue = 0;
        if (schedulerType === 'MLQ' && numQueues > 0) {
            initialQueue = parseInt(document.getElementById(`processQueue${i}`).value) - 1;
        }
        processes.push({
            id: i + 1,
            arrival,
            burst,
            remaining: burst,
            priority,
            queue: initialQueue,
            start: -1,
            finish: -1,
            turnaround: 0,
            waiting: 0
        });
    }

    // Sort processes by arrival time
    processes.sort((a, b) => a.arrival - b.arrival);

    // Simulate
    let result;
    if (schedulerType === 'MLQ') {
        result = simulateMLQ(processes, queues);
    } else {
        result = simulateMLFQ(processes, queues);
    }

    // Display results
    displayResults(result.processes, result.gantt);
});

function simulateMLQ(processes, queues) {
    // Assign processes to fixed queues
    processes.forEach(p => queues[p.queue].processes.push(p));

    const gantt = [];
    let currentTime = 0;
    let completed = 0;
    const totalProcesses = processes.length;

    while (completed < totalProcesses) {
        let executed = false;
        
        // Check queues in priority order (0 = highest priority)
        for (let q = 0; q < queues.length && !executed; q++) {
            const queue = queues[q];
            const readyProcesses = queue.processes.filter(p => p.arrival <= currentTime && p.remaining > 0);
            
            if (readyProcesses.length > 0) {
                let selectedProcess = null;
                let processIndex = -1;
                
                // Select process based on queue algorithm
                if (queue.algo === 'FCFS') {
                    selectedProcess = readyProcesses.reduce((earliest, p) => p.arrival < earliest.arrival ? p : earliest);
                } else if (queue.algo === 'SJF') {
                    selectedProcess = readyProcesses.reduce((shortest, p) => 
                        p.remaining < shortest.remaining || (p.remaining === shortest.remaining && p.arrival < shortest.arrival) ? p : shortest);
                } else if (queue.algo === 'SRTF') {
                    selectedProcess = readyProcesses.reduce((shortest, p) => 
                        p.remaining < shortest.remaining || (p.remaining === shortest.remaining && p.arrival < shortest.arrival) ? p : shortest);
                } else if (queue.algo === 'Priority') {
                    selectedProcess = readyProcesses.reduce((highest, p) => 
                        p.priority < highest.priority || (p.priority === highest.priority && p.arrival < highest.arrival) ? p : highest);
                } else if (queue.algo === 'RR') {
                    selectedProcess = readyProcesses[0]; // First ready process for RR
                }
                
                if (selectedProcess) {
                    processIndex = queue.processes.indexOf(selectedProcess);
                    
                    if (selectedProcess.start === -1) selectedProcess.start = currentTime;
                    
                    const execTime = (queue.algo === 'RR') ? Math.min(queue.quantum, selectedProcess.remaining) : 
                                   (queue.algo === 'SRTF') ? 1 : selectedProcess.remaining;
                    
                    gantt.push({ process: `P${selectedProcess.id}`, start: currentTime, end: currentTime + execTime });
                    selectedProcess.remaining -= execTime;
                    currentTime += execTime;
                    
                    if (selectedProcess.remaining === 0) {
                        selectedProcess.finish = currentTime;
                        completed++;
                        queue.processes.splice(processIndex, 1);
                    } else if (queue.algo === 'RR') {
                        // Move to end of queue for RR
                        queue.processes.splice(processIndex, 1);
                        queue.processes.push(selectedProcess);
                    }
                    
                    executed = true;
                }
            }
        }
        
        if (!executed) {
            // Find next arrival time
            let nextArrival = Infinity;
            processes.forEach(p => {
                if (p.remaining > 0 && p.arrival > currentTime) {
                    nextArrival = Math.min(nextArrival, p.arrival);
                }
            });
            
            if (nextArrival < Infinity) {
                gantt.push({ process: 'Idle', start: currentTime, end: nextArrival });
                currentTime = nextArrival;
            } else {
                break;
            }
        }
    }

    calculateTimes(processes);
    return { processes, gantt };
}

function simulateMLFQ(processes, queues) {
    const gantt = [];
    let currentTime = 0;
    let completed = 0;
    const readyQueues = queues.map(() => []);
    const totalProcesses = processes.length;
    
    // Sort processes by arrival time
    const sortedProcesses = [...processes].sort((a, b) => a.arrival - b.arrival);
    let processIndex = 0;

    while (completed < totalProcesses) {
        // Add newly arrived processes to highest priority queue (queue 0)
        while (processIndex < sortedProcesses.length && sortedProcesses[processIndex].arrival <= currentTime) {
            readyQueues[0].push(sortedProcesses[processIndex]);
            processIndex++;
        }

        let executed = false;
        
        // Check queues in priority order (0 = highest priority)
        for (let q = 0; q < queues.length && !executed; q++) {
            const currentQueue = readyQueues[q];
            if (currentQueue.length === 0) continue;

            const { algo, quantum } = queues[q];
            let selectedProcess = null;
            let index = 0;

            // Select process based on algorithm
            if (algo === 'FCFS' || algo === 'RR') {
                selectedProcess = currentQueue[0];
                index = 0;
            } else if (algo === 'SJF') {
                selectedProcess = currentQueue[0];
                for (let i = 1; i < currentQueue.length; i++) {
                    if (currentQueue[i].remaining < selectedProcess.remaining || 
                        (currentQueue[i].remaining === selectedProcess.remaining && currentQueue[i].arrival < selectedProcess.arrival)) {
                        selectedProcess = currentQueue[i];
                        index = i;
                    }
                }
            } else if (algo === 'SRTF') {
                selectedProcess = currentQueue[0];
                for (let i = 1; i < currentQueue.length; i++) {
                    if (currentQueue[i].remaining < selectedProcess.remaining || 
                        (currentQueue[i].remaining === selectedProcess.remaining && currentQueue[i].arrival < selectedProcess.arrival)) {
                        selectedProcess = currentQueue[i];
                        index = i;
                    }
                }
            } else if (algo === 'Priority') {
                selectedProcess = currentQueue[0];
                for (let i = 1; i < currentQueue.length; i++) {
                    if (currentQueue[i].priority < selectedProcess.priority || 
                        (currentQueue[i].priority === selectedProcess.priority && currentQueue[i].arrival < selectedProcess.arrival)) {
                        selectedProcess = currentQueue[i];
                        index = i;
                    }
                }
            }

            if (selectedProcess) {
                if (selectedProcess.start === -1) selectedProcess.start = currentTime;
                
                const execTime = (algo === 'RR') ? Math.min(quantum, selectedProcess.remaining) : 
                               (algo === 'SRTF') ? 1 : selectedProcess.remaining;
                
                gantt.push({ process: `P${selectedProcess.id}`, start: currentTime, end: currentTime + execTime });
                selectedProcess.remaining -= execTime;
                currentTime += execTime;

                // Remove from current queue
                currentQueue.splice(index, 1);
                
                if (selectedProcess.remaining === 0) {
                    selectedProcess.finish = currentTime;
                    completed++;
                } else {
                    if (algo === 'SRTF') {
                        // For SRTF, put back in same queue for preemption
                        readyQueues[q].push(selectedProcess);
                    } else {
                        // Move to next lower priority queue (feedback mechanism)
                        const nextQueue = q < queues.length - 1 ? q + 1 : q;
                        readyQueues[nextQueue].push(selectedProcess);
                    }
                }
                
                executed = true;
            }
        }
        
        if (!executed) {
            // Find next arrival time
            let nextArrival = Infinity;
            if (processIndex < sortedProcesses.length) {
                nextArrival = sortedProcesses[processIndex].arrival;
            }
            
            if (nextArrival > currentTime && nextArrival < Infinity) {
                gantt.push({ process: 'Idle', start: currentTime, end: nextArrival });
                currentTime = nextArrival;
            } else {
                break;
            }
        }
    }

    calculateTimes(processes);
    return { processes, gantt };
}

// Optimized execution functions for MLQ
const executeAlgorithm = {
    FCFS: (queue, currentTime, gantt) => {
        const p = queue.processes.find(p => p.arrival <= currentTime && p.remaining > 0);
        if (!p) return false;
        
        if (p.start === -1) p.start = currentTime;
        const execTime = p.remaining;
        p.remaining = 0;
        p.finish = currentTime + execTime;
        gantt.push({ process: `P${p.id}`, start: currentTime, end: currentTime + execTime });
        queue.processes.splice(queue.processes.indexOf(p), 1);
        return true;
    },
    
    SJF: (queue, currentTime, gantt) => {
        let p = null, minRem = Infinity, index = -1;
        for (let i = 0; i < queue.processes.length; i++) {
            const proc = queue.processes[i];
            if (proc.arrival <= currentTime && proc.remaining > 0 && 
                (proc.remaining < minRem || (proc.remaining === minRem && proc.arrival < (p?.arrival ?? Infinity)))) {
                p = proc;
                minRem = proc.remaining;
                index = i;
            }
        }
        if (!p) return false;
        
        if (p.start === -1) p.start = currentTime;
        const execTime = p.remaining;
        p.remaining = 0;
        p.finish = currentTime + execTime;
        gantt.push({ process: `P${p.id}`, start: currentTime, end: currentTime + execTime });
        queue.processes.splice(index, 1);
        return true;
    },
    
    Priority: (queue, currentTime, gantt) => {
        let p = null, minPri = Infinity, index = -1;
        for (let i = 0; i < queue.processes.length; i++) {
            const proc = queue.processes[i];
            if (proc.arrival <= currentTime && proc.remaining > 0 && 
                (proc.priority < minPri || (proc.priority === minPri && proc.arrival < (p?.arrival ?? Infinity)))) {
                p = proc;
                minPri = proc.priority;
                index = i;
            }
        }
        if (!p) return false;
        
        if (p.start === -1) p.start = currentTime;
        const execTime = p.remaining;
        p.remaining = 0;
        p.finish = currentTime + execTime;
        gantt.push({ process: `P${p.id}`, start: currentTime, end: currentTime + execTime });
        queue.processes.splice(index, 1);
        return true;
    },
    
    RR: (queue, currentTime, gantt, quantum) => {
        let p = null, index = -1;
        for (let i = 0; i < queue.processes.length; i++) {
            if (queue.processes[i].arrival <= currentTime && queue.processes[i].remaining > 0) {
                p = queue.processes[i];
                index = i;
                break;
            }
        }
        if (!p) return false;
        
        if (p.start === -1) p.start = currentTime;
        const execTime = Math.min(quantum, p.remaining);
        p.remaining -= execTime;
        gantt.push({ process: `P${p.id}`, start: currentTime, end: currentTime + execTime });
        
        queue.processes.splice(index, 1);
        if (p.remaining > 0) {
            queue.processes.push(p);
        } else {
            p.finish = currentTime + execTime;
        }
        return true;
    }
};

function executeFCFS(queue, currentTime, gantt) {
    return executeAlgorithm.FCFS(queue, currentTime, gantt);
}

function executeSJF(queue, currentTime, gantt) {
    return executeAlgorithm.SJF(queue, currentTime, gantt);
}

function executePriority(queue, currentTime, gantt) {
    return executeAlgorithm.Priority(queue, currentTime, gantt);
}

function executeRR(queue, currentTime, gantt, quantum) {
    return executeAlgorithm.RR(queue, currentTime, gantt, quantum);
}

function calculateTimes(processes) {
    processes.forEach(p => {
        p.turnaround = p.finish - p.arrival;
        p.waiting = p.turnaround - p.burst;
    });
}

function displayResults(processes, gantt) {
    // Color palette for processes
    const processColors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe',
        '#43e97b', '#38f9d7', '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    
    const getProcessColor = (processName) => {
        if (processName === 'Idle') return '#e2e8f0';
        const processId = parseInt(processName.replace('P', '')) - 1;
        return processColors[processId % processColors.length];
    };
    
    const ganttCells = gantt.map(item => {
        const bgColor = getProcessColor(item.process);
        const textColor = item.process === 'Idle' ? '#1e293b' : '#020617';
        return `<td style="background: ${bgColor}; color: ${textColor}; box-shadow: 0 4px 8px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1);">${item.process}<br><small>${item.start}-${item.end}</small></td>`;
    }).join('');
    
    const processRows = processes.map(p => {
        const color = getProcessColor(`P${p.id}`);
        return `<tr><td style="background: ${color}; color: #020617; font-weight: 700;">P${p.id}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority}</td><td>${p.finish}</td><td>${p.turnaround}</td><td>${p.waiting}</td></tr>`;
    }).join('');
    
    const totalTurnaround = processes.reduce((sum, p) => sum + p.turnaround, 0);
    const totalWaiting = processes.reduce((sum, p) => sum + p.waiting, 0);
    const processCount = processes.length;
    
    // Calculate CPU utilization: Sum of Burst Times / Max Finish Time
    const totalBurstTime = processes.reduce((sum, p) => sum + p.burst, 0);
    const maxFinishTime = processes.length > 0 ? Math.max(...processes.map(p => p.finish)) : 0;
    const cpuUtilization = maxFinishTime > 0 ? (totalBurstTime / maxFinishTime * 100) : 0;
    
    // Handle NaN cases
    const avgTurnaround = processCount > 0 ? (totalTurnaround / processCount).toFixed(2) : '0.00';
    const avgWaiting = processCount > 0 ? (totalWaiting / processCount).toFixed(2) : '0.00';
    const cpuUtil = isNaN(cpuUtilization) ? '0.00' : cpuUtilization.toFixed(2);
    
    outputDiv.innerHTML = `
        <div class="section-title">📊 Simulation Results</div>
        
        <h3 class="results-heading gantt-heading">🎯 Gantt Chart</h3>
        <div class="gantt-chart">
            <table><tr>${ganttCells}</tr></table>
        </div>
        
        <h3 class="results-heading">📋 Ordered Processes</h3>
        <p class="results-subtitle">Processes ordered by arrival time with their computed scheduling metrics.</p>
        <table class="results-table">
            <tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Priority</th><th>Finish</th><th>Turnaround</th><th>Waiting</th></tr>
            ${processRows}
        </table>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${avgTurnaround}</div>
                <div>Avg Turnaround Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${avgWaiting}</div>
                <div>Avg Waiting Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${cpuUtil}%</div>
                <div>CPU Utilization</div>
            </div>
        </div>
    `;
}