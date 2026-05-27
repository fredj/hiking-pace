import distance from '@turf/distance';


export function read(text) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  return Promise.resolve(doc);
}


export function toSegments(doc) {
  const trkpts = Array.from(doc.querySelectorAll('trkseg trkpt'));
  const segments = [];
  for (let i = 1; i < trkpts.length; i++) {
    const cur = trkpts[i];
    const prev = trkpts[i - 1];
    segments.push({
      length: distance(
        [parseFloat(cur.getAttribute('lon')), parseFloat(cur.getAttribute('lat'))],
        [parseFloat(prev.getAttribute('lon')), parseFloat(prev.getAttribute('lat'))]
      ) * 1000,
      height: parseFloat(cur.querySelector('ele').textContent) - parseFloat(prev.querySelector('ele').textContent),
      duration: (Date.parse(cur.querySelector('time').textContent) - Date.parse(prev.querySelector('time').textContent)) / 1000
    });
  }
  return segments;
}


export function combine(segments, fn) {
  const results = [];
  let length = 0;
  let height = 0;
  let duration = 0;
  for (let i = 0, ii = segments.length; i < ii; i++) {
    const cur = segments[i];
    length += cur.length;
    height += cur.height;
    duration += cur.duration;
    if (fn(length, height, duration, i)) {
      results.push({
        length: length,
        height: height,
        duration: duration
      });
      length = height = duration = 0;
    }
  }
  if (length > 0) {
    results.push({length, height, duration});
  }
  return results;
}


const MAX_PACE = 60;

export function convert(segments) {
  return segments
    .filter(segment => segment.duration > 0)
    .map(segment => ({
      slope: (segment.height / segment.length) * 100,
      pace: (segment.duration / 60) / (segment.length / 1000)
    }))
    .filter(point => point.pace <= MAX_PACE);
}
