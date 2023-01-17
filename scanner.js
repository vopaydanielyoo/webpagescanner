const puppeteer = require("puppeteer");
const fs = require('fs');
const pixelmatch = require('pixelmatch');
const PNG = require('pngjs').PNG;

// const img1 = PNG.sync.read(fs.readFileSync('./previous-scan/desktopImages/gpsales.png'));
// const img2 = PNG.sync.read(fs.readFileSync('./previous-scan/desktopImages/flinks-sales.png'));
// const {width, height} = img1;
// const diff = new PNG({width, height});

// let pixeldiff = pixelmatch(img1.data, img2.data, diff.data, width, height, {threshold: 0.1});
// console.log(pixeldiff);
// fs.writeFileSync('diff.png', PNG.sync.write(diff));

let notScannedDesktop = [];
let notScannedMobile = [];

(async () => {
    await main();
    // await checkDifferences();
})();


async function main() {
    links = await getUrls();
    // links = ['https://vopay.com/contact/']
    let page = "";

    const browser = await puppeteer.launch({
        headless: false,    // delete this line when testing is done
        defaultViewport: {width: 2000, height: 1000}
        // args: [
        //     '--start-fullscreen' // you can also use '--start-fullscreen'
        // ]
    });

    for (i = 0; i < links.length; i++) {
        if (page.includes("/")) page.replace("/", "_");
        page = links[i].split('.com/').pop();
        page = page.slice(0, -1);
        if (page == "") page = "homePage";
        console.log(`${i}/${links.length}: ${page}`);
        try {
            const img = await getImg(browser, links[i], `./current-scan/desktopImages/${page}.png`, 1800);
        } catch (e) {
            console.log("#######        Couldn't Capture Page for Desktop")
            console.log("#######        Url: ", links[i], "  page: ", page);
            notScannedDesktop.push(links[i]);
        }
        // mobile
        // finally {
        //     try {
        //         const img = await getImg(links[i], `./current-scan/mobileImages/${page}.png`, 400);
        //     } catch (e) {
        //         console.log("$$$$$$$        Couldn't Capture Page for mobile    $$$$$$$")
        //         console.log("$$$$$$$        Url: ", links[i], "  page: ", page, "   $$$$$$$");
        //         notScannedMobile.push(links[i]);
        //     }
        //     notScannedMobile.splice(i, 1);
        // }
        notScannedDesktop.splice(i, 1);
    };
    
    printFailedScans();
    
    console.log("\n \n retrying failed desktop scans... \n");
    
    for (i = 0; i < notScannedDesktop.length; i++) {
        page = notScannedDesktop[i].split('.com/').pop();
        page = page.slice(0, -1);
        console.log(`${i}/${notScannedDesktop.length}: ${page}`);
        try {
            const img = await getImg(browser, notScannedDesktop[i], `./current-scan/desktopImages/${page}.png`, 1800);
        } catch (e) {
            console.log("#######        Couldn't Capture Page for Desktop")
            console.log("#######        Url: ", notScannedDesktop[i], "  page: ", page);
            notScannedDesktop.push(notScannedDesktop[i]);
        }
        notScannedDesktop.splice(i, 1);
    };

    // console.log("\n retrying failed mobile scans... \n");

    // for (i = 0; i < notScannedMobile.length; i++) {
    //     page = notScannedMobile[i].split('.com/').pop();
    //     page = page.slice(0, -1);
    //     if (page == "") page = "homePage";
    //     console.log(`${i}/${notScannedMobile.length}: ${page}`);
    //     try {
    //         const img = await getImg(browser, notScannedMobile[i], `./current-scan/mobileImages/${page}.png`, 400);
    //     } catch (e) {
    //         console.log("#######        Couldn't Capture Page for Mobile")
    //         console.log("#######        Url: ", notScannedMobile[i], "  page: ", page);
    //         notScannedMobile.push(notScannedMobile[i]);
    //     }
    //     notScannedMobile.splice(i, 1);
    // };

    printFailedScans();

    await browser.close();
};

async function checkDifferences() {
    let img1, img2, diffImg, pixeldiff;
    const dir = await fs.promises.opendir("./previous-scan/desktopImages")
    for await (const file of dir) {
        console.log(file.name)
        img1 = PNG.sync.read(fs.readFileSync(`./previous-scan/desktopImages/${file.name}`));
        img2 = PNG.sync.read(fs.readFileSync(`./current-scan/desktopImages/${file.name}`));
        let {width, height} = img1;
        diffImg = new PNG({width, height});
        pixeldiff = pixelmatch(img1.data, img2.data, diffImg.data, width, height, {threshold: 0.1});
        // console.log(pixeldiff);

        if (pixeldiff > 0) fs.writeFileSync(`./differences/desktopImages/${file.name}`, PNG.sync.write(diffImg));
    }

}

function compareImages(image1, image2) {
    // const img1 = PNG.sync.read(fs.readFileSync(`${image1}.png`));
    // const img2 = PNG.sync.read(fs.readFileSync(`${image2}.png`));
    // const {width, height} = img1;
    // const diff = new PNG({width, height});

    // pixelmatch(img1.data, img2.data, diff.data, width, height, {threshold: 0.1});

    // fs.writeFileSync('diff.png', PNG.sync.write(diff));
}

async function getUrls() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://vopay.com/page-sitemap.xml');

    const links = await page.$$eval('table tr td a', tds => tds.map((td) => {
        return td.innerText;
    }));

    await page.close();
    return links;
}

async function getImg(browser, url, path, width) {
    const page = await browser.newPage();
    
    await page.goto(url, {
        waitUntil: 'load'
    });

    await wait(2000);

    const viewportHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewport({ width: width, height: viewportHeight });

    let scrollHeight = 0;
    while (scrollHeight < viewportHeight) {
        scrollHeight += 200;
        await page.evaluate(() => {
            window.scrollBy(0, 200);
        });
        await page.mouse.click(100, 100);
    }

    // Scroll back to top
    await page.evaluate(() => {
        window.scrollTo(0, 0);
    });

    await wait(2000);

    // const pdf = await page.pdf({path:'sample2'});
    const img = await page.screenshot({ type: 'png', fullpage: true, path: path });

    // const img = await page.screenshot({ type: 'png', fullpage: true });
    // const params = { Bucket: bucket, Key: path, Body: img };
    // uploadedImg = await s3.putObject(params).promise();
    // console.log(uploadedImg.Location);

    await page.close();
    return img;
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}

function printFailedScans() {

    console.log(`\n \n --------------- ${notScannedDesktop.length} UNSCANNED PAGES (Desktop) ---------------`);
    for (let i = 0; i < notScannedDesktop.length; i++) {
        console.log(notScannedDesktop[i]);
    }
    if (notScannedDesktop.length > 0) console.log("--------------- END LIST ---------------");
    console.log("########################################");
    
    console.log(`--------------- ${notScannedMobile.length} UNSCANNED PAGES (Mobile) ---------------`);
    for (let i = 0; i < notScannedMobile.length; i++) {
        console.log(notScannedMobile[i]);
    }
    
    if (notScannedMobile.length > 0) console.log("--------------- END LIST ---------------");
}