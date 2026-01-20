import crypto from "crypto";

const UNITS = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
};

function calculateSize(query) {
  let total = 0;
  for (const unit in UNITS) {
    if (query[unit]) {
      const value = Number(query[unit]);
      if (!Number.isFinite(value) || value < 0) return null;
      total += value * UNITS[unit];
    }
  }
  return total > 0 ? total : null;
}

function generateChunk(size, seed) {
  let out = "";
  while (out.length < size) {
    seed = crypto.createHash("sha256").update(seed).digest("hex");
    out += seed;
  }
  return { buffer: Buffer.from(out.slice(0, size)), seed };
}

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");
  const forceDownload = pathname === "/download";

  const size = calculateSize(req.query);
  if (!size) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "text/plain");
    return res.end("Invalid or missing size query");
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Length", size);

  if (forceDownload) {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=\"generated_${size}_bytes.txt\"`
    );
  }

  const CHUNK_SIZE = 64 * 1024;
  let sent = 0;
  let seed = "seed";

  while (sent < size) {
    const remaining = size - sent;
    const chunkSize = Math.min(CHUNK_SIZE, remaining);
    const result = generateChunk(chunkSize, seed);
    seed = result.seed;

    res.write(result.buffer);
    sent += chunkSize;
  }

  res.end();
}
