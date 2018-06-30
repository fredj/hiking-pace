import distance from '@turf/distance';
import {parseString} from 'xml2js';


export function read(text) {
  return new Promise((resolve, reject) => {
    parseString(text, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.gpx);
      }
    });
  });
}


export function toSegments(result) {
  // FIXME: use xpath ?
  const trkpt = result.trk[0].trkseg[0].trkpt;
  const segments = [];
  for (let i = 1, ii = trkpt.length; i < ii; i++) {
    const cur = trkpt[i];
    const prev = trkpt[i - 1];
    segments.push({
      length: distance([cur.$.lon, cur.$.lat], [prev.$.lon, prev.$.lat]) * 1000,
      height: parseFloat(cur.ele[0]) - parseFloat(prev.ele[0]),
      duration: (Date.parse(cur.time[0]) - Date.parse(prev.time[0])) / 1000
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
  return results;
}


export function convert(segments) {
  return segments.map(segment => {
    const slope = (segment.height / segment.length) * 100;
    const pace = (segment.duration / 60) / (segment.length / 1000);

    return {
      slope: slope,
      pace: pace
    };
  });
}
