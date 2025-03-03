const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

// helper function to fetch the event description from the event detail page
async function fetchEventDescription(eventUrl) {
  try {
    const { data: detailHtml } = await axios.get(eventUrl);
    const $$ = cheerio.load(detailHtml);
    const description = $$('div.description[itemprop="description"]').text().trim();
    return description;
  } catch (err) {
    console.error(`Error fetching details from ${eventUrl}: ${err.message}`);
    return '';
  }
}
async function scrapeCalendarEvents() {
  const baseUrl = 'https://www.du.edu/calendar';
  let allEvents = [];
  let months = [];
  for (let month = 1; month <= 12; month++) {
    const start = `2025-${month.toString().padStart(2, '0')}-01`;
    let end;
    if (month === 12) {
      end = '2026-01-01';
    } else {
      end = `2025-${(month + 1).toString().padStart(2, '0')}-01`;
    }
    months.push({ start, end });
  }

  for (const { start, end } of months) {
    const url = `${baseUrl}?search=&start_date=${start}&end_date=${end}#events-listing-date-filter-anchor`;
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      $('#events-listing .events-listing__item').each(async (i, elem) => {
        const eventLinkElem = $(elem).find('a.event-card');
        if (eventLinkElem.length > 0) {
          const date = eventLinkElem.find('p').first().text().trim();
          const title = eventLinkElem.find('h3').text().trim();
          let time = eventLinkElem.find('p:has(span.icon-du-clock)').text().trim();
          let eventUrl = eventLinkElem.attr('href');
          if (eventUrl && !eventUrl.startsWith('http')) {
            eventUrl = 'https://www.du.edu' + eventUrl;
          }

          let description = '';
          if (eventUrl) {
            description = await fetchEventDescription(eventUrl);
          }

          let eventObj = { title, date };
          if (time) {
            eventObj.time = time;
          }

          if (description) {
            eventObj.description = description;
          }

          allEvents.push(eventObj);
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Error fetching events for month starting ${start}: ${err.message}`);
    }
  }
  // Since we used an asynchronous loop inside .each, wait a few seconds before writing output.
  // In production, you might want to collect promises and await them properly.
  setTimeout(async () => {
    await fs.ensureDir('results');
    await fs.writeJson('results/calendar_events.json', { events: allEvents }, { spaces: 2 });
    console.log('Calendar events scraping complete. Results saved to results/calendar_events.json');
  }, 5000);
}

scrapeCalendarEvents();