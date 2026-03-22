# Performance Analysis of CPU Scheduling with Context Switching Overhead

## Objective
This project is an interactive, browser-based operating system simulator designed to teach CPU scheduling algorithms and demonstrate the real-world impact of **Context Switching Overhead** on system performance.

It serves as a comprehensive educational tool for college OS assignments, allowing students to visualize theoretical ideal scheduling versus realistic hardware implementations.

## Features Included
1. **Interactive Inputs:** Add, modify, and delete processes with custom Arrival Time, Burst Time, and Priority.
2. **Context Switch Support:** Configurable Context Switch (CS) overhead times to see how administrative tasks affect CPU utilization and turnaround times.
3. **Four Core Algorithms:**
   - First Come First Serve (FCFS)
   - Shortest Job First (SJF) – Non-Preemptive
   - Priority Scheduling – Non-Preemptive
   - Round Robin (RR) with configurable Time Quantum
4. **Rich Visualization:** Dynamically generated Gantt Charts with color coding for Processes, CS time, and CPU Idle time.
5. **Step-By-Step Simulation Demo:** An interactive "Next Step" and "Auto Play" live timeline visualization showing the state of the CPU and the Ready Queue at every tick.
6. **Comparison Mode:** Side-by-side Gantt charts, metrics, and a dynamic bar chart comparing the chosen algorithm *with* and *without* context switching overhead.
7. **Educational Explanations:** Auto-generated text explaining the metrics, process flow, and analytical conclusions for the simulation run.
8. **Modern UI:** Clean aesthetic, fully responsive, with Dark/Light mode support without reliance on heavy frameworks.

## How to Run Locally
Because this project utilizes only client-side web technologies (HTML, CSS, Vanilla JavaScript), no complex backend setup or servers are required.

1. **Download/Clone** this repository or folder.
2. Ensure you have the `index.html`, `style.css`, and `script.js` files in the same directory.
3. **Double click `index.html`** to open it natively in any modern web browser (Google Chrome, Firefox, Edge, Safari).
4. *Note: An internet connection is required purely to load the `Chart.js`, `FontAwesome` (icons), and `Google Fonts` CDNs. Everything else runs locally.*

## Sample Input Scenario
To quickly test the tool, click the **"Load Sample"** button on the UI, which populates:
- **P1:** Arrival 0, Burst 5, Priority 2
- **P2:** Arrival 1, Burst 3, Priority 1
- **P3:** Arrival 2, Burst 8, Priority 4
- **P4:** Arrival 3, Burst 6, Priority 3
- **Algorithm:** Round Robin (Quantum = 2)
- **Context Switch:** 1

Run the simulation and observe how Round Robin creates multiple context switch blocks!

## Screenshots
*(Add screenshots of your interface running locally here prior to final submission!)*
- Gantt Chart Output
- Comparison Bar Chart
- Step-by-step UI

## Future Scope
- Exporting Gantt Charts and result tables directly to PDF or CSV.
- Adding preemptive versions of SJF (SRTF) and Priority scheduling.
- Integrating Multi-level Queue Scheduling.

---
**Tech Stack:** HTML5, CSS3, JavaScript (ES6+), Chart.js

