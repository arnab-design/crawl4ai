const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post('/crawl', async (req, res) => {
  const { root_url, max_pages = 20 } = req.body;

  if (!root_url) return res.status(400).json({ error: 'Missing root_url' });

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(root_url, { waitUntil: 'networkidle2' });

  const rawLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    return anchors.map(a => a.href).filter(h => h.includes(location.hostname));
  });

  const urls = [...new Set([root_url, ...rawLinks])].slice(0, max_pages);
  const pages = [];

  for (const url of urls) {
    try {
      const p = await browser.newPage();
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const title = await p.title();
      const text = await p.evaluate(() => document.body.innerText.trim());
      pages.push({ url, title, text });
      await p.close();
    } catch {
      pages.push({ url, error: true });
    }
  }

  await browser.close();
  res.json({ pages });
});

app.listen(3000, () => console.log('Crawl4AI running on port 3000'));
