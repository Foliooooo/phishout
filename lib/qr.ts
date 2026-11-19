import QRCode from "qrcode";

export const QR_URL = "https://phishout.folioo.tech";

const INK = "#2b1d24";
const PINK = "#ff5fa2";

/**
 * A branded QR code as an SVG string: rounded dot modules, custom finder
 * "eyes" with pink centres, and a PHISH//OUT mark in the middle. Error
 * correction is High (≈30%), which leaves room for the centre mark.
 */
export function brandedQrSvg(url = QR_URL, { size = 1024, margin = 4 } = {}) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const count = qr.modules.size;
  const total = count + margin * 2;
  const unit = size / total;
  const at = (n: number) => (n + margin) * unit;
  const dark = (row: number, col: number) => qr.modules.get(row, col) === 1;

  const finders = [[0, 0], [0, count - 7], [count - 7, 0]];
  const inFinder = (row: number, col: number) => finders.some(([r, c]) => row >= r && row < r + 7 && col >= c && col < c + 7);
  // Leave a clear square in the centre for the mark.
  const hole = Math.ceil(count * 0.22) | 1;
  const holeStart = Math.floor((count - hole) / 2);
  const inHole = (row: number, col: number) => row >= holeStart && row < holeStart + hole && col >= holeStart && col < holeStart + hole;

  const dots: string[] = [];
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!dark(row, col) || inFinder(row, col) || inHole(row, col)) continue;
      dots.push(`<circle cx="${(at(col) + unit / 2).toFixed(2)}" cy="${(at(row) + unit / 2).toFixed(2)}" r="${(unit * 0.44).toFixed(2)}"/>`);
    }
  }

  const eyes = finders.map(([r, c]) => {
    const x = at(c), y = at(r);
    return [
      `<rect x="${x + unit * 0.5}" y="${y + unit * 0.5}" width="${unit * 6}" height="${unit * 6}" rx="${unit * 1.8}" fill="none" stroke="${INK}" stroke-width="${unit}"/>`,
      `<rect x="${x + unit * 2}" y="${y + unit * 2}" width="${unit * 3}" height="${unit * 3}" rx="${unit * 0.9}" fill="${PINK}"/>`,
    ].join("");
  }).join("");

  const cx = size / 2;
  const badge = hole * unit * 0.86;
  const mark = `
    <rect x="${cx - badge / 2}" y="${cx - badge / 2}" width="${badge}" height="${badge}" rx="${badge * 0.24}" fill="${INK}"/>
    <text x="${cx}" y="${cx - badge * 0.06}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="700" font-size="${badge * 0.26}" fill="#ffffff">PHISH</text>
    <text x="${cx}" y="${cx + badge * 0.26}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="700" font-size="${badge * 0.26}" fill="#ffffff"><tspan fill="${PINK}">//</tspan>OUT</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="QR code for ${url}">
  <rect width="${size}" height="${size}" rx="${unit * 2}" fill="#ffffff"/>
  <g fill="${INK}">${dots.join("")}</g>${eyes}${mark}
</svg>`;
}
