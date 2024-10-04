const readline = require('readline');
const axios = require('axios');
const { JSDOM } = require('jsdom');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb://tyi.duckdns.org:32768';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function processUrl(linkDocument, linksCollection) {
    const inputUrl = linkDocument.url;
    const parsedUrl = url.parse(inputUrl);
    const pathSegments = parsedUrl.pathname.split('/');
    const fileNamePart = pathSegments[pathSegments.length - 2];

    try {
        const response = await axios.get(inputUrl);
        const html = response.data;

        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract and save all links from the page
        const links = Array.from(document.querySelectorAll('a'))
            .map(anchor => anchor.href)
            .map(href => href.startsWith('http') ? href : `https://www.cleanpng.com${href}`); // Prepend base URL if not absolute

        for (const link of links) {
            const existingLink = await linksCollection.findOne({ url: link });
            if (!existingLink) {
                await linksCollection.insertOne({ url: link, crawled: false, downloaded: null });
            }
        }

        // Extract the dwagain variable if it exists
        const scriptContent = Array.from(document.querySelectorAll('script'))
            .map(script => script.textContent)
            .join('\n');

        const dwagainMatch = scriptContent.match(/var\s+dwagain\s*=\s*['"]([^'"]+)['"]/);
        let dwagain = null;
        let downloaded = null;
        if (dwagainMatch) {
            dwagain = dwagainMatch[1];
            downloaded = false; // Set downloaded to false if dwagain is found
        }

        // Save the title of the page
        const title = document.querySelector('title') ? document.querySelector('title').textContent : 'No Title';

        // Update the initial link document with dwagain, title, and downloaded status
        await linksCollection.updateOne(
            { _id: linkDocument._id },
            { $set: { dwagain: dwagain, title: title, downloaded: downloaded, crawled: true } }
        );

        console.log(`Processed URL: ${inputUrl}`);
        console.log(`Title: ${title}`);
        if (dwagain) {
            console.log(`dwagain: ${dwagain}`);
        } else {
            console.log('dwagain variable not found.');
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            // Update the initial link's status to crawled if 404 error occurs
            await linksCollection.updateOne(
                { _id: linkDocument._id },
                { $set: { crawled: true } }
            );
            console.log(`URL not found (404): ${inputUrl}`);
        } else {
            console.error('Error:', error);
        }
    }
}

async function main() {
    try {
        await client.connect();
        const database = client.db('db');
        const linksCollection = database.collection('links');
        let linkDocument;
        while (linkDocument = await linksCollection.findOne({ crawled: false })) {
            console.log(linkDocument);
            await processUrl(linkDocument, linksCollection);
        }

        console.log('No more links to crawl.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
