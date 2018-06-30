/**
 * @param {number} length Length in meter.
 * @param {number} slope Slope in degrees.
 * @return walking time in minutes per kilometers.
 */
export function hiking_time(length, slope) {
  const CS = [
    14.271, 0.36992, 0.025922, -0.0014384, 0.000032105, 0.0000081542, -0.000000090261,
    -0.000000020757, 0.00000000010192, 0.000000000028588, -0.000000000000057466,
    -0.000000000000021842, 0.000000000000000015176, 0.0000000000000000086894,
    -0.0000000000000000000013584, -0.0000000000000000000014026
  ];
  let mpk = 0
  for (let i = 0, ii = CS.length; i < ii; i++) {
    mpk += CS[i] * Math.pow(slope, i)
  }
  return mpk * length / 1000
}
