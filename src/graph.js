// FIXME: global regression line
import * as d3 from 'd3';
import {hiking_time} from './time';


const margin = {top: 20, right: 20, bottom: 60, left: 70};
const x = d3.scaleLinear();
const y = d3.scaleLinear();

const theoretical = generate(slope => hiking_time(1000, slope));

x.domain(d3.extent(theoretical, d => d.slope)).nice();
y.domain([0, d3.max(theoretical, d => d.pace)]).nice();

const line = d3.line()
  .x(d => x(d.slope))
  .y(d => y(d.pace))
  .curve(d3.curveBasis);

const band = d3.area()
  .x(d => x(d.slope))
  .y0(d => y(d.lo))
  .y1(d => y(d.hi))
  .curve(d3.curveBasis);

let g;
let entries = [];

export function init(dest) {
  const svg = d3.select(dest);

  g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

  g.append('g').attr('class', 'grid');
  g.append('line').attr('class', 'zero-line');
  g.append('g').attr('class', 'axis x-axis');
  g.append('g').attr('class', 'axis y-axis');
  g.append('path').attr('class', 'theoretical line');

  g.append('text')
    .attr('class', 'axis-label x-label')
    .attr('text-anchor', 'end')
    .text('slope (%)');

  g.append('text')
    .attr('class', 'axis-label y-label')
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .text('min / km');

  const legend = g.append('g').attr('class', 'legend');

  const lineItems = [
    {label: 'Swiss hiking model', cls: 'theoretical line'},
    {label: 'Your pace (regression)', cls: 'line regression highlighted'},
    {label: '95% confidence interval', cls: 'ci-band highlighted'},
  ];

  lineItems.forEach((item, i) => {
    const row = legend.append('g').attr('transform', `translate(0, ${i * 22})`);
    if (item.cls.includes('ci-band')) {
      row.append('rect')
        .attr('x', 0).attr('width', 24)
        .attr('y', 1).attr('height', 10)
        .attr('class', item.cls);
    } else {
      row.append('line')
        .attr('x1', 0).attr('x2', 24)
        .attr('y1', 6).attr('y2', 6)
        .attr('class', item.cls);
    }
    row.append('text')
      .attr('class', 'legend-label')
      .attr('x', 30).attr('y', 10)
      .text(item.label);
  });

  const dotRow = legend.append('g').attr('transform', `translate(0, ${lineItems.length * 22})`);
  dotRow.append('circle').attr('cx', 12).attr('cy', 6).attr('class', 'dot highlighted');
  dotRow.append('text').attr('class', 'legend-label').attr('x', 30).attr('y', 10).text('Measured segments');

  const observer = new ResizeObserver(() => redraw());
  observer.observe(svg.node());
  redraw();

  return g;
}


function redraw() {
  const svgEl = document.querySelector('#graph');
  if (!svgEl) return;
  const width = svgEl.clientWidth - margin.left - margin.right;
  const height = svgEl.clientHeight - margin.top - margin.bottom;
  if (width <= 0 || height <= 0) return;

  x.range([0, width]);
  y.range([height, 0]);

  g.select('.grid')
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));

  g.select('.zero-line')
    .attr('x1', x(0)).attr('x2', x(0))
    .attr('y1', 0).attr('y2', height);

  g.select('.x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(width / 80))).tickFormat(val => `${val}%`));

  g.select('.y-axis')
    .call(d3.axisLeft(y).ticks(Math.max(2, Math.floor(height / 50))).tickFormat(val => `${val}:00`));

  g.select('.x-label')
    .attr('x', width)
    .attr('y', height + margin.top + 20);

  g.select('.y-label')
    .attr('x', -height / 2)
    .attr('y', -margin.left + 14);

  g.select('path.theoretical')
    .datum(theoretical)
    .attr('d', line);

  g.select('.legend')
    .attr('transform', `translate(${width - 200}, 10)`);

  entries.forEach(entry => {
    const step = Math.max((entry.slopeMax - entry.slopeMin) / 40, 0.5);
    const lineData = generate(s => ({slope: s, pace: Math.max(0, entry.ci(s).pred)}), entry.slopeMin, entry.slopeMax, step);
    const bandData = generate(entry.ci, entry.slopeMin, entry.slopeMax, step);

    g.select(`path.regression.${entry.id}`).datum(lineData).attr('d', line);
    g.select(`path.ci-band.${entry.id}`).datum(bandData).attr('d', band);

    g.selectAll(`circle.${entry.id}`)
      .attr('cx', d => x(d.slope))
      .attr('cy', d => y(d.pace));
  });
}


export function plot(g, entry) {
  const sorted = [...entry.points].map(d => d.slope).sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const iqr = q3 - q1;
  const slopeMin = Math.max(d3.min(entry.points, d => d.slope), Math.min(q1 - 1.5 * iqr, median - 10));
  const slopeMax = Math.min(d3.max(entry.points, d => d.slope), Math.max(q3 + 1.5 * iqr, median + 10));
  const ci = buildCI(entry.points, 4);
  const step = Math.max((slopeMax - slopeMin) / 40, 0.5);

  entries.push({id: entry.id, ci, slopeMin, slopeMax, points: entry.points});

  const lineData = generate(s => ({slope: s, pace: Math.max(0, ci(s).pred)}), slopeMin, slopeMax, step);
  const bandData = generate(ci, slopeMin, slopeMax, step);

  // CI band rendered first (behind the regression line)
  g.append('path')
    .datum(bandData)
    .attr('class', `ci-band ${entry.id}`)
    .attr('d', band);

  g.append('path')
    .datum(lineData)
    .attr('class', `line regression ${entry.id}`)
    .attr('d', line);

  g.selectAll(`.dot-${entry.id}`)
    .data(entry.points)
    .enter()
    .append('circle')
    .attr('class', `dot ${entry.id}`)
    .attr('cx', d => x(d.slope))
    .attr('cy', d => y(d.pace));
}

export function unhighlight(g) {
  g.selectAll('circle.dot').classed('highlighted', false);
  g.selectAll('path.line').classed('highlighted', false);
  g.selectAll('path.ci-band').classed('highlighted', false);
}

export function highlight(g, className) {
  unhighlight(g);
  g.selectAll('circle.dot').filter(`.${className}`).classed('highlighted', true);
  g.selectAll('path.line').filter(`.${className}`).classed('highlighted', true);
  g.selectAll('path.ci-band').filter(`.${className}`).classed('highlighted', true);
}


// ── 95% confidence interval for polynomial regression ────────────────────────

function buildCI(points, order) {
  const n = points.length;
  const p = order + 1;

  // Normalize slopes for numerical stability
  const mu = points.reduce((s, pt) => s + pt.slope, 0) / n;
  const sigma = Math.sqrt(points.reduce((s, pt) => s + (pt.slope - mu) ** 2, 0) / n) || 1;
  const norm = s => (s - mu) / sigma;

  // Design matrix X (n × p)
  const X = points.map(pt => Array.from({length: p}, (_, j) => norm(pt.slope) ** j));
  const yv = points.map(pt => pt.pace);

  // X'X (p × p) and X'y (p)
  const XtX = Array.from({length: p}, (_, i) =>
    Array.from({length: p}, (_, j) => X.reduce((s, row) => s + row[i] * row[j], 0))
  );
  const Xty = Array.from({length: p}, (_, i) =>
    X.reduce((s, row, k) => s + row[i] * yv[k], 0)
  );

  const beta = matSolve(XtX, Xty);
  const XtXinv = matInvert(XtX);

  // Residual variance s²
  const s2 = yv.reduce((s, yi, i) => {
    const fit = X[i].reduce((sum, x, j) => sum + x * beta[j], 0);
    return s + (yi - fit) ** 2;
  }, 0) / (n - p);

  // t critical value (1.96 for large df, conservative for small df)
  const df = n - p;
  const t = df >= 30 ? 1.96 : 2.0 + 20.0 / df;

  return (slope) => {
    const x0 = Array.from({length: p}, (_, j) => norm(slope) ** j);
    const pred = x0.reduce((s, x, j) => s + x * beta[j], 0);
    const v = x0.reduce((s, xi, i) =>
      s + xi * XtXinv[i].reduce((ss, mij, j) => ss + mij * x0[j], 0), 0
    );
    const se = Math.sqrt(Math.max(0, s2 * v));
    return {slope, pred, lo: Math.max(0, pred - t * se), hi: pred + t * se};
  };
}

// Gauss-Jordan elimination: solve Ax = b
function matSolve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    if (Math.abs(d) < 1e-10) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
    for (let k = c; k <= n; k++) M[c][k] /= d;
  }
  return M.map(r => r[n]);
}

// Gauss-Jordan inversion
function matInvert(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({length: n}, (_, j) => +(i === j))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++)
      if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    if (Math.abs(d) < 1e-10) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / d;
      for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k];
    }
    for (let k = 0; k < 2 * n; k++) M[c][k] /= d;
  }
  return M.map(r => r.slice(n));
}

function generate(fn, min=-40, max=40, step=5) {
  const data = [];
  for (let i = min; i <= max; i += step) {
    data.push(typeof fn(i) === 'object' ? fn(i) : {slope: i, pace: fn(i)});
  }
  return data;
}
