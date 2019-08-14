// FIXME: global regression line
// FIXME: confidence interval in regression line
import * as d3 from 'd3';
import regression from 'regression';
import {hiking_time} from './time';


const margin = {top: 20, right: 20, bottom: 60, left: 100};
const x = d3.scaleLinear();
const y = d3.scaleLinear();

export function init(dest) {
  const svg = d3.select(dest);
  const width = +svg.attr('width') - margin.left - margin.right;
  const height = +svg.attr('height') - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

  const theoretical = generate(slope => hiking_time(1000, slope));

  x.range([0, width]);
  y.range([height, 0]);

  const line = d3.line()
    .x(d => x(d.slope))
    .y(d => y(d.pace))
    .curve(d3.curveBasis);

  x.domain(d3.extent(theoretical, d => d.slope)).nice();
  y.domain([0, d3.max(theoretical, d => d.pace)]).nice();

  g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .attr('class', 'axis x-axis')
    .call(d3.axisBottom(x).tickFormat(val => `${val}%`));

  g.append('g')
    .attr('class', 'axis y-axis')
    .call(d3.axisLeft(y).tickFormat(val => `${val}:00 / km`));

  g.append('path')
   .datum(theoretical)
   .attr('class', 'theoretical line')
   .attr('d', line);

  g.append('text')
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .attr('x', width)
    .attr('y', height + margin.top + 20)
    .text('slope');

  g.append('text')
    .attr('class', 'axis-label')
    .attr('text-anchor', 'end')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 20)
    .text('minutes / km')

  return g;
}


export function plot(g, entry) {
  const reg = regression.polynomial(entry.points.map(point => [point.slope, point.pace]), {order: 8});
  const data = generate(slope => reg.predict(slope)[1]);

  const line = d3.line()
    .x(d => x(d.slope))
    .y(d => y(d.pace))
    .curve(d3.curveBasis);

  g.append('path')
    .datum(data)
    .attr('class', `line regression ${entry.id}`)
    .attr('d', line);

  g.selectAll('dot')
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
}

export function highlight(g, className) {
  unhighlight(g);

  // FIXME: not nice
  g.selectAll('circle.dot')
    .filter(`.${className}`)
    .classed('highlighted', true);

  g.selectAll('path.line')
    .filter(`.${className}`)
    .classed('highlighted', true);
}


function generate(fn, min=-40, max=40, step=5) {
  const data = [];
  for (let i = min; i < max; i += step) {
    data.push({
      slope: i,
      pace: fn(i)
    });
  }
  return data;
}
