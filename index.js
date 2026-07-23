import express from "express";

const app = express();

app.get(/.*/, async (req, res) => {
  try {
    const encoded = req.path.slice(1);

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

    const upstreamHeaders = {
      "Accept": "*/*",
      "Accept-Encoding": "identity;q=1, *;q=0",
      "Accept-Language": "en-GB,en;q=0.9",
      "DNT": "1",
      "Origin": "https://lok-lok.cc",
      "Referer": "https://lok-lok.cc/",
      "sec-ch-ua":
        '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "Sec-Fetch-Dest": "video",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    };

    if (req.headers.range) {
      upstreamHeaders["Range"] = req.headers.range;
    }

    const upstreamRes = await fetch(target, {
      method: "GET",
      headers: upstreamHeaders,
    });

    res.status(upstreamRes.status);

    upstreamRes.headers.forEach((value, key) => {
      // Skip hop-by-hop headers
      if (
        [
          "connection",
          "keep-alive",
          "proxy-authenticate",
          "proxy-authorization",
          "te",
          "trailer",
          "transfer-encoding",
          "upgrade",
        ].includes(key.toLowerCase())
      ) {
        return;
      }

      res.setHeader(key, value);
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`
    );

    if (!upstreamRes.body) {
      return res.end();
    }

    // Stream response
    const reader = upstreamRes.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        res.end();
        break;
      }

      if (!res.write(Buffer.from(value))) {
        await new Promise((resolve) => res.once("drain", resolve));
      }
    }
  } catch (err) {
    console.error(err);

    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    } else {
      res.destroy();
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
