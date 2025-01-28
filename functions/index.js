const scraper = require('./scraper');
const admin = require('firebase-admin');
const { getDatabase,query } = require('firebase-admin/database');

const {onSchedule} = require("firebase-functions/v2/scheduler");
const chromium = require("chrome-aws-lambda");
const {onRequest} = require("firebase-functions/v2/https");

admin.initializeApp();
const database= getDatabase()

const supl_ziskani_datumu = async () => {
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true // Set to true for headless mode
    });    const page = await browser.newPage();
    try {

        let dny = [];

        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/Sestava_pro_web_menu.html');

        dny = await page.$$eval('option', elements=>{
            return Array.from(elements).map((el)=>{
                return el.getAttribute('value');
            })
        })
        return dny;
    }catch (error){
        throw (new Error(error))
    }finally {
        await browser.close();
    }

};
const formatDateToCustomString = (dateInput)=> {
    const date = new Date(dateInput);
    date.getDay()===0?date.setDate(date.getDate()+1):date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}_${month}_${day}`;
}
function formatDateString(dateString) {
    // Split the input string by underscore
    const [year, month, day] = dateString.split('-');

    // Convert month and day to numbers and format them
    const formattedMonth = parseInt(month, 10); // Convert to number
    const formattedDay = parseInt(day, 10); // Convert to number

    // Return the formatted string
    return `${formattedDay}.${formattedMonth}.`;
}
let supl = [];
async function fetchSmallTab(url, value) {
    supl = [];
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true // Set to true for headless mode
    });
    try {
        const page = await browser.newPage();
        await page.goto(url);

        const parts = url.split('_');
        const date = parts.slice(-3).join('-').replace('.html', '');

        const rows = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            if (tables.length >= 2) {
                const secondLastTable = tables[tables.length - 2];

                return Array.from(secondLastTable.querySelectorAll('tr')).map(row => row.outerHTML);
            } else {
                return [];
            }
        });
        for (let i = 0; i < rows.length; i++) {
            const rowHTML = rows[i];

            if (rowHTML.includes(value)) {
                const firstCellRowspan = await page.$eval(`table:nth-of-type(3) tr:nth-of-type(${i + 1}) td:first-child`, cell => cell.getAttribute('rowspan'));

                if (firstCellRowspan) {
                    const rowspan = parseInt(firstCellRowspan, 10);

                    for (let j = 0; j < rowspan; j++) {
                        await setDocSuplProUcebny(page, `table:nth-of-type(3) tr:nth-of-type(${i + 1 + j})`,value,date);
                    }
                } else {
                    await setDocSuplProUcebny(page, `table:nth-of-type(3) tr:nth-of-type(${i + 1})`,value,date);
                }
            }
        }

        await browser.close()

    } catch (e) {
        console.error('Error:', e);
    }

    return supl;

}
async function setDocSuplProUcebny(page, selector,ucebna,date) {
    const suplovaniRoz = {};

    const cellStyleC1 = await page.$$eval(`${selector} .CellStyle_C1`, elements => elements.map(el => el.textContent.trim()));
    suplovaniRoz.den = formatDateString(date);
    suplovaniRoz.trida = cellStyleC1[cellStyleC1.length - 1];
    suplovaniRoz.hodina = await page.$eval(`${selector} .CellStyle_C2`, el => el.textContent.trim());
    suplovaniRoz.chybejici = cellStyleC1[cellStyleC1.length - 2];
    suplovaniRoz.predmet = cellStyleC1[cellStyleC1.length - 3];

    const cellStyleC3 = await page.$$eval(`${selector} .CellStyle_C3`, elements => elements.map(el => el.textContent.trim()));
    suplovaniRoz.ucebna = ucebna;
    suplovaniRoz.nahradni_ucebna = cellStyleC3[cellStyleC3.length - 2];


    suplovaniRoz.poznamka = "";
    suplovaniRoz.zastupujici = "";
    supl.push(suplovaniRoz);
}
const fetchData= async (url, value) =>{
    supl = [];
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true // Set to true for headless mode
    });
    try {
        const page = await browser.newPage();
        await page.goto(url);

        const parts = url.split('_');
        const date = parts.slice(-3).join('-').replace('.html', '');

        const rows = await page.$$eval('table:nth-of-type(2) tr', rows => rows.map(row => row.outerHTML));

        for (let i = 0; i < rows.length; i++) {
            const rowHTML = rows[i];
            if (rowHTML.includes(value)) {
                const firstCellRowspan = await page.$eval(`table:nth-of-type(2) tr:nth-of-type(${i + 1}) td:first-child`, cell => cell.getAttribute('rowspan'));

                if (firstCellRowspan) {
                    const rowspan = parseInt(firstCellRowspan, 10);

                    for (let j = 0; j < rowspan; j++) {
                        await setDocSupl(page, `table:nth-of-type(2) tr:nth-of-type(${i + 1 + j})`,value,date);
                    }
                } else {
                    await setDocSupl(page, `table:nth-of-type(2) tr:nth-of-type(${i + 1})`,value,date);
                }
            }
        }

    } catch (error) {
        throw (new Error(error))
    }finally
    {
        await browser.close()
    }

    return supl;

}
const setDocSupl= async (page, selector,trida,date) => {
    const suplovaniRoz = {};
    suplovaniRoz.den = formatDateString(date);
    suplovaniRoz.trida = trida;
    suplovaniRoz.hodina = await page.$eval(`${selector} .CellStyle_B2`, el => el.textContent.trim());
    suplovaniRoz.chybejici = await page.$eval(`${selector} .CellStyle_B3`, el => el.textContent.trim());

    const cellStyleB1 = await page.$$eval(`${selector} .CellStyle_B1`, elements => elements.map(el => el.textContent.trim()));
    suplovaniRoz.predmet = cellStyleB1[cellStyleB1.length - 4];
    suplovaniRoz.ucebna = cellStyleB1[cellStyleB1.length - 3];
    suplovaniRoz.nahradni_ucebna = cellStyleB1[cellStyleB1.length - 2];
    suplovaniRoz.poznamka = cellStyleB1[cellStyleB1.length - 1];

    suplovaniRoz.zastupujici = await page.$eval(`${selector} .CellStyle_B4`, el => el.textContent.trim());

    supl.push(suplovaniRoz);
}

exports.rozvrhAddRealtime = onSchedule({schedule:" 0 1 1-6,9-12 *", memory:"8GiB", timeoutSeconds:3000, region:"europe-central2",timeZone:"CET"}, async (res,event) => {
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true // Set to true for headless mode
    });

    try {
        const tridy = await scraper.tridy();
        for (const trida of tridy) {
            const scrapedRozvrh = await scraper.screpeRozvrh(trida);
            const withoutExtension = trida.replace(/\.html$/, '');
            const result = withoutExtension.replace(/^rozvrh_Trida_/, '');
            const ref = database.ref(`rozvrh`);
            const usersRef = ref.child(result);
            await usersRef.set(scrapedRozvrh)
        }

        const vyucujici = await scraper.vyucujici();
        for (const ucitel of vyucujici) {
            const scrapedRozvrh = await scraper.scrapeVyucujici(ucitel);
            const withoutExtension = ucitel.replace(/\.html$/, '');
            const result = withoutExtension.replace(/^rozvrh_Vyucujici_/, '');
            const ref = database.ref(`rozvrh`);
            const usersRef = ref.child(result);
            await usersRef.set(scrapedRozvrh)
        }
    }catch (err){
        throw new Error(err)
    }

    try {
        const page = await browser.newPage();

        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Trida_Menu.html');

        const tridy = await page.$$eval('option', elements=>{
            return Array.from(elements).map((el)=>{
                const cely = el.getAttribute('value');
                return cely.split("Trida_")[1].split(".html")[0]
            })
        })

        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Vyucujici_Menu.html');
        const vyucujici = await page.$$eval('option', elements=>{
            return Array.from(elements).map((el)=>{
                return  el.textContent;
            })
        })

        const refTridy = database.ref(`tridy`);
        await refTridy.set(tridy);

        const refVyucujici = database.ref(`vyucujici`);
        await refVyucujici.set(vyucujici);

    }catch (error){
        throw (new Error(error))
    }finally {
        await browser.close()
    }
})

exports.suplovani =  onSchedule({schedule:"*/30 6-22 * 1-6,9-12 0-5", memory:"4GiB", timeoutSeconds:1200, region:"europe-central2", timeZone:"CET"}, async (res,event) => {

        //musim dat vsechny funkce sem kvuli datumum asi to bude nejjednodussi

    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true // Set to true for headless mode
    });

    try {
        const page = await browser.newPage();
        const date = formatDateToCustomString(new Date())
        const dnyVSuplovani = await supl_ziskani_datumu()
        const url = `Sestava_pro_web_${date}.html`;
        const index = dnyVSuplovani.findIndex(el => el === url);
        const dnyProScraping = index !== -1 ? dnyVSuplovani.slice(0, index + 1) : [];

        for(const den of dnyProScraping){
            await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/${den}`)

            const suplVyucujici = await page.evaluate(() => {
                const cells = document.querySelectorAll("table:nth-of-type(1) .cell");
                // Determine which cell to use and split its text
                const index = Array.from(cells).findIndex((cell) => cell.textContent.includes("Vyučující:"));

                const text = cells[index+1].innerText
                //Split the text by commas, trim white spaces, and filter out empty strings
                return text
                    .split(",")
                    .map(item => item.trim()) // Remove white spaces from each item
                    .filter(item => item !== "");
            });

            const chybejiciTridy = await page.evaluate(() => {
                const cells = document.querySelectorAll("table:nth-of-type(1) .cell");
                // Determine which cell to use and split its text
                const index = Array.from(cells).findIndex((cell) => cell.textContent.includes("Třída:"));
                if(index===-1){
                    return []
                }
                const text = cells[index+1].innerText
                //Split the text by commas, trim white spaces, and filter out empty strings
                return text
                    .split(",")
                    .map(item => item.trim()) // Remove white spaces from each item
                    .filter(item => item !== ""); // Remove empty strings if any
            });

            function parseString(input) {
                let regex;
                !isNaN(parseInt(input[0])) ?  regex = /^([a-zA-Z0-9]+(?:\s*-\s*[a-zA-Z0-9]+(?:\/[a-zA-Z0-9]+)?)?)\s*\(((?:\d+\.\.\d+|\d+)(?:,\s*(?:\d+\.\.\d+|\d+))*)\)$/: regex = /^([\wÁÉÍÓÚŮÝČĎĚŇŘŠŤŽáéíóúůýčďěňřšťž\s.]+)\s*\(((?:\d+\.\.\d+|\d+)(?:,\s*(?:\d+\.\.\d+|\d+))*)\)$/;

                const match = input.match(regex);

                if (!match) {
                    throw new Error("Invalid format")
                }

                const label = match[1]; // Extract the label, e.g., "2SjTZ"
                const content = match[2]; // Extract the content inside parentheses

                const numbers = [];

                // Split the content by commas and process each part
                content.split(',').forEach((part) => {
                    part = part.trim();
                    if (part.includes('..')) {
                        // Handle ranges like "0..2"
                        const [start, end] = part.split('..').map(Number);
                        for (let i = start; i <= end; i++) {
                            numbers.push(i);
                        }
                    } else {
                        // Handle single numbers like "9"
                        numbers.push(Number(part));
                    }
                });

                return {label:label.split(" ")[0], numbers};
            }

            //najde ucebny ve spodni tabulce v suplovani
            const ucebny_v_suplovani = await page.evaluate(() => {

                const tables = document.querySelectorAll('table');
                let rows;
                if (tables.length >= 2) {
                    // Get the second-to-last table
                    const secondLastTable = tables[tables.length - 2];

                    // Select all rows within the tbody of the second-to-last table
                    rows = secondLastTable.querySelectorAll('tbody tr');

                    // Example: Log the rows
                    rows.forEach(row => console.log(row.outerHTML));
                } else {
                    console.log('Not enough tables on the page.');
                }
                const tridy = [];

                Array.from(rows).map(row=>{
                    const firstCell = row.querySelector('td:first-of-type');
                    if (firstCell && firstCell.classList.contains('CellStyle_C1')) {
                        tridy.push(firstCell.innerText.replace(/\s+/g, '').split(",")) ;
                    }
                })
                const flattedTridy = tridy.flat();
                const noDuplicates = new Set(flattedTridy);
                return [...noDuplicates];
            });

            //najde tridy ktery jsou v suplovani
            const rows = await page.evaluate(() => {
                const rows = document.querySelectorAll('table:nth-of-type(2) tbody tr');
                const tridy = [];
                Array.from(rows).map(row => {
                    const firstCell = row.querySelector('td:first-of-type');
                    if (firstCell && firstCell.classList.contains('CellStyle_B1')) {
                        tridy.push(firstCell.innerText.replace(/\s+/g, '').split(","));
                    }
                })
                const flattedTridy = tridy.flat();
                const noDuplicates = new Set(flattedTridy);

                return [...noDuplicates];
            });

            const suplPoTridach = [];

            for (const trida of rows) {
                const result = await fetchData(`https://www.sps-tabor.cz/rozvrh-supl/${den}`, trida);
                suplPoTridach.push(result);
            }
            for (const ucebna of ucebny_v_suplovani) {
                const result = await fetchSmallTab(`https://www.sps-tabor.cz/rozvrh-supl/${den}`, ucebna);
                suplPoTridach.push(result);
            }

            const ref = database.ref(`suplovani`);
            const usersRef = ref.child(`${den.match(/(\d{4}_\d{2}_\d{2})/)[0]}`);
            await usersRef.set(suplPoTridach.flat(2))

            for (const el of chybejiciTridy) {
                await usersRef.push(parseString(el))
            }
            for (const el of suplVyucujici) {
                await usersRef.push(parseString(el))
            }

        }

    } catch (error) {
        throw (new Error(error))
    } finally {
        await browser.close();
    }



})

exports.vymazat = onSchedule({schedule:"0 0 * 1-6,9-12 0", memory:"4GiB", timeoutSeconds:1200, region:"europe-central2", timeZone:"CET"}, async (res,event) =>{
    try {
        const snapshot = await database.ref("suplovani").get();
        const data = snapshot.val();

        if (!data) {
            throw new Error("No data found.")
        }

        const ids = Object.keys(data);

        let result =[]
        if (ids.length > 10) {
            result = ids.slice(0, ids.length - 10);
        }

        const deletePromises = result.map(id =>
            database.ref(`suplovani/${id}`).remove()
        );

        await Promise.all(deletePromises);

    } catch (error) {
        console.error("Error fetching data:", error);
    }

})