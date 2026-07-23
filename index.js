import express from "express";

const app = express();

const ALLOWED_ORIGINS = [
  "https://domain3.com",
  "https://domain2.com",
  "https://domain1.com"
];

function isAllowed(ref = "") {
  return ALLOWED_ORIGINS.some(origin => ref.startsWith(origin));
}

app.get("/*", async (req, res) => {
  try {
    const referer = req.get("referer") || "";
    const origin = req.get("origin") || "";

    if (!isAllowed(referer) && !isAllowed(origin)) {
      return res.status(403).send("no");
    }

    const encoded = req.params[0];

    if (!encoded) {
      return res.status(400).send("Missing encoded URL");
    }

    let target;

    try {
      target = decodeURIComponent(encoded);

      if (!/^https?:\/\//i.test(target)) {
        return res.status(400).send("Invalid URL");
      }
    } catch {
      return res.status(400).send("Invalid encoding");
    }

    const filenameParam = req.query.n || "video.mp4";

    const safeName = filenameParam
      .replace(/[\\/]/g, "")
      .endsWith(".mp4")
      ? filenameParam
      : filenameParam + ".mp4";

    const headers = {
      "Accept": "*/*",
      "Accept-Encoding": "identity;q=1, *;q=0",
      "Accept-Language": "en-GB,en;q=0.9",
      "DNT": "1",
      "Origin": "https://lok-lok.cc",
      "Referer": "https://lok-lok.cc/",
      "sec-ch-ua": '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "video",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent": "Mozilla/5.0"
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const upstream = await fetch(target, {
      headers
    });

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`
    );

    if (!upstream.body) {
      return res.end();
    }

    const reader = upstream.body.getReader();

    async function pump() {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          res.end();
          break;
        }

        res.write(Buffer.from(value));
      }
    }

    pump().catch(err => {
      console.error(err);
      res.destroy(err);
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
