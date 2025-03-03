const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const url = 'https://bulletin.du.edu/undergraduate/coursedescriptions/comp/';

async function scrapeCourses() {
    try {
        // Fetch the HTML of the page
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const courses = [];

        // Select all course blocks
        $('.courseblock').each((index, element) => {
            const courseTitle = $(element).find('.courseblocktitle').text().trim();
            const courseDescription = $(element).find('.courseblockdesc').text().trim();

            // Extract course code (e.g., COMP 3000)
            const courseCodeMatch = courseTitle.match(/COMP\s(\d{4})/);
            if (courseCodeMatch) {
                const courseCode = courseCodeMatch[1];

                // Check if it's an upper-division course (3000-level or higher)
                if (parseInt(courseCode) >= 3000) {
                    // Check for prerequisites in the description
                    const hasPrerequisite = /Prerequisite[s]?:/i.test(courseDescription);
                    if (!hasPrerequisite) {
                        // Extract course title without the code
                        const title = courseTitle.replace(/COMP\s\d{4}\s-\s/, '');
                        courses.push({
                            course: `COMP-${courseCode}`,
                            title: title
                        });
                    }
                }
            }
        });

        // Define the output path
        const outputPath = path.join(__dirname, 'results', 'bulletin.json');

        // Write the data to a JSON file
        await fs.outputJson(outputPath, { courses }, { spaces: 4 });

        console.log(`Successfully saved ${courses.length} courses to ${outputPath}`);
    } catch (error) {
        console.error('An error occurred while scraping the courses:', error);
    }
}

scrapeCourses();
