const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/api/track", async (req, res) => {
    const trackingNumber = req.query.num || req.query.tracking_number;
    if (!trackingNumber) {
        return res.status(400).json({ error: "Tracking number is required" });
    }

    const url = `https://parcelsapp.com/en/tracking/${trackingNumber}`;
    let browser;

    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            timeout: 0, // ✅ No timeout
        });

        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        await page.waitForSelector(".event, .no-tracking-info", { timeout: 5000 }).catch(() => {});

        const noTracking = await page.evaluate(() => {
            return document.body.innerText.includes("No information about your package");
        });

        if (noTracking) {
            return res.status(404).json({ error: "Tracking number not found or no updates yet." });
        }

        const trackingEvents = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(".event")).map(event => ({
                date: event.querySelector(".event-time strong")?.innerText.trim() || "N/A",
                time: event.querySelector(".event-time span")?.innerText.trim() || "N/A",
                status: event.querySelector(".event-content strong")?.innerText.trim() || "N/A",
                courier: event.querySelector(".carrier")?.innerText.trim() || "N/A"
            }));
        });

        const parcelInfo = await page.evaluate(() => {
            const getText = (selector) => document.querySelector(selector)?.innerText.trim() || "N/A";

            return {
                tracking_number: getText(".parcel-attributes tr:nth-child(1) .value span"),
                origin: getText(".parcel-attributes tr:nth-child(2) .value span:nth-child(2)"),
                destination: getText(".parcel-attributes tr:nth-child(3) .value span:nth-child(2)"),
                courier: getText(".parcel-attributes tr:nth-child(4) .value a"),
                days_in_transit: getText(".parcel-attributes tr:nth-child(6) .value span"),
                tracking_link: getText(".tracking-link input")
            };
        });

        if (!trackingEvents.length) {
            return res.json({ message: "Tracking found, but no updates yet.", parcel_info: parcelInfo });
        }

        res.json({
            tracking_details: trackingEvents,
            parcel_info: parcelInfo
        });

    } catch (error) {
        console.error("Scraping error:", error);
        res.status(500).json({ error: "Internal server error. Please try again later." });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
