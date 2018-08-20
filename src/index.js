import {html, render} from 'lit-html';
import {repeat} from 'lit-html/lib/repeat';
import {saveSvgAsPng} from 'save-svg-as-png';

import * as graph from './graph';
import * as gpx from './gpx';
import * as drop from './drop';

const g = graph.init('#graph');

document.querySelector('#files').addEventListener('mouseover', event => {
  const entryId = event.target.dataset.entryId;
  if (entryId) {
    graph.highlight(g, entryId);
  }
});

document.querySelector('#files').addEventListener('mouseout', () => {
  graph.unhighlight(g);
});

document.querySelector('#export').addEventListener('click', () => {
  saveSvgAsPng(document.querySelector('#graph'), 'graph.png');
});

const entries = [];
const entriesTemplate = (entries) => html`
  <ul class="entries">
      ${repeat(entries, entry => entry.id, entry => html`
        <li data-entry-id="${entry.id}">${entry.name} (${(entry.length / 1000).toFixed(2)} km, ${entry.points.length} pts)</li>
      `)}
  </ul>`;

drop.init('#graph', (text) => {
  gpx.read(text).then(content => {
    const segments = gpx.toSegments(content)
    const combined = gpx.combine(segments, length => length > 25);
    const entryId = `entry_${entries.length}`;
    const entry = {
      id: entryId,
      name: content.trk[0].name[0],
      length: combined.map(segment => segment.length).reduce((acc, val) => acc + val, 0),
      points: gpx.convert(combined)
    };
    entries.push(entry)

    render(entriesTemplate(entries), document.querySelector('#files'));
    graph.plot(g, entry);
    graph.highlight(g, entryId);
  });
});
