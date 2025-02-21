(function () {
  "use strict";

  // --- Constants and Configuration ---
  const CSV_PATH = "data/data.csv"; // Path to your CSV file

  // --- Utility Functions ---

  // Synchronize slider and number input values; the number input is the master value.
  function syncValue(prefix, source) {
    const slider = document.getElementById(prefix);
    const number = document.getElementById(prefix + "_num");
    if (source === "slider") {
      number.value = slider.value;
      document.getElementById(prefix + "_value").textContent = slider.value;
    } else {
      document.getElementById(prefix + "_value").textContent = number.value;
    }
    updatePlot();
  }

  // Load CSV data from the given path and parse into an object { x: [...], y: [...] }.
  function loadCSVData(callback) {
    fetch(CSV_PATH)
      .then(response => response.text())
      .then(text => {
        const x = [];
        const y = [];
        let lines = text.split("\n").filter(line => line.trim() !== "");
        // Remove header if present
        if (lines[0].toLowerCase().includes("x")) {
          lines.shift();
        }
        lines.forEach(line => {
          const parts = line.split(",");
          if (parts.length >= 2) {
            x.push(parseFloat(parts[0]));
            y.push(parseFloat(parts[1]));
          }
        });
        callback({ x, y });
      })
      .catch(error => console.error("Error loading CSV data:", error));
  }

  // --- Global Variables ---
  let data; // Will hold the CSV data
  let yMin = 0, yMax = 0;

  // --- Plotting Function ---
  function updatePlot() {
    if (!data) return; // Wait until data is loaded

    // Retrieve precise values from number inputs
    const B0_linear = parseFloat(document.getElementById("B0_linear_num").value);
    const B1_linear = parseFloat(document.getElementById("B1_linear_num").value);
    const B0_quadratic = parseFloat(document.getElementById("B0_quadratic_num").value);
    const B1_quadratic = parseFloat(document.getElementById("B1_quadratic_num").value);
    const B2_quadratic = parseFloat(document.getElementById("B2_quadratic_num").value);

    // Create an array of x values for the fitted lines (100 evenly spaced points)
    const xFit = Array.from({ length: 100 }, (_, i) => i * 20);

    // Compute predicted y-values
    const yLinear = xFit.map(x => B0_linear + B1_linear * x);
    const yQuadratic = xFit.map(x => B0_quadratic + B1_quadratic * x + B2_quadratic * Math.pow(x, 2));

    // Create vertical dotted error lines for linear model
    const linearShapes = data.x.map((xVal, i) => {
      const predicted = B0_linear + B1_linear * xVal;
      return {
        type: "line",
        x0: xVal,
        y0: data.y[i],
        x1: xVal,
        y1: predicted,
        line: { color: "grey", dash: "dot", width: 1 }
      };
    });

    // Create vertical dotted error lines for quadratic model
    const quadraticShapes = data.x.map((xVal, i) => {
      const predicted = B0_quadratic + B1_quadratic * xVal + B2_quadratic * Math.pow(xVal, 2);
      return {
        type: "line",
        x0: xVal,
        y0: data.y[i],
        x1: xVal,
        y1: predicted,
        line: { color: "grey", dash: "dot", width: 1 }
      };
    });

    // Common layout for Plotly charts
    const commonLayout = {
      xaxis: {
        title: "Search Ad Spending",
        showgrid: false,
        spikemode: "toaxis",
        spikesnap: "cursor",
        spikecolor: "black",
        spikethickness: 1
      },
      yaxis: {
        title: "Revenue",
        range: [yMin, yMax],
        showgrid: false,
        spikemode: "toaxis",
        spikesnap: "cursor",
        spikecolor: "black",
        spikethickness: 1
      },
      hovermode: "closest"
    };

    // Plot linear model
    Plotly.newPlot("linearPlot", [
      { x: data.x, y: data.y, mode: "markers", type: "scatter", name: "Actual Data", marker: { color: "blue" } },
      { x: xFit, y: yLinear, mode: "lines", type: "scatter", name: "Linear Fit", line: { color: "red", dash: "dot" } }
    ], { ...commonLayout, title: "Linear Fit", shapes: linearShapes });

    // Update linear model equation display
    document.getElementById("equation_linear").innerHTML =
      "<strong>Linear Model:</strong> REVENUE = " + B0_linear.toFixed(1) + " + " + B1_linear.toFixed(2) + " * Search_AdSpending";

    // Calculate and display MAE for linear model
    const maeLinear = data.x.reduce((sum, xVal, i) => sum + Math.abs(data.y[i] - (B0_linear + B1_linear * xVal)), 0) / data.x.length;
    document.getElementById("mae_linear").innerHTML =
      "<strong>MAE:</strong> (1/N) Σ |Actual_REVENUE<sub>i</sub> − Predicted_REVENUE<sub>i</sub>| = " + maeLinear.toFixed(3);

    // Plot quadratic model
    Plotly.newPlot("quadraticPlot", [
      { x: data.x, y: data.y, mode: "markers", type: "scatter", name: "Actual Data", marker: { color: "blue" } },
      { x: xFit, y: yQuadratic, mode: "lines", type: "scatter", name: "Quadratic Fit", line: { color: "red", dash: "dot" } }
    ], { ...commonLayout, title: "Quadratic Fit", shapes: quadraticShapes });

    // Update quadratic model equation display
    document.getElementById("equation_quadratic").innerHTML =
      "<strong>Quadratic Model:</strong> REVENUE = " + B0_quadratic.toFixed(1) + " + " + B1_quadratic.toFixed(2) + " * Search_AdSpending + " + B2_quadratic.toFixed(6) + " * (Search_AdSpending)<sup>2</sup>";

    // Calculate and display MAE for quadratic model
    const maeQuadratic = data.x.reduce((sum, xVal, i) => sum + Math.abs(data.y[i] - (B0_quadratic + B1_quadratic * xVal + B2_quadratic * Math.pow(xVal, 2))), 0) / data.x.length;
    document.getElementById("mae_quadratic").innerHTML =
      "<strong>MAE:</strong> (1/N) Σ |Actual_REVENUE<sub>i</sub> − Predicted_REVENUE<sub>i</sub>| = " + maeQuadratic.toFixed(3);
  }

  // --- Initialization ---
  loadCSVData(function(loadedData) {
    data = loadedData;
    // Set y-axis range based on loaded data
    yMin = Math.min(...data.y) - 10;
    yMax = Math.max(...data.y) + 10;
    updatePlot();
  });

  // Expose syncValue globally for HTML inline event handlers
  window.syncValue = syncValue;
})();
