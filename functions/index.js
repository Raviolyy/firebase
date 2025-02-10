const admin = require('firebase-admin');
const { getDatabase } = require('firebase-admin/database');

const {onSchedule} = require("firebase-functions/v2/scheduler");
const chromium = require("chrome-aws-lambda");

admin.initializeApp();
const database= getDatabase()

const scrapeDataUrls = async () => {
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true
    });

    const page = await browser.newPage();
    try {
        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/Sestava_pro_web_menu.html');
        return await page.$$eval('option', elements => {
            return Array.from(elements).map((el) => {
                return el.getAttribute('value');
            })
        });
    }catch (error){
        throw (new Error(error))
    }finally {
        await browser.close();
    }

};
const formatToUnderScoreDate = (dateInput)=> {
    const date = new Date(dateInput);
    date.getDay()===0?date.setDate(date.getDate()+1):date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}_${month}_${day}`;
}
function formatDateWithDots(dateString) {
    const [year, month, day] = dateString.split('-');
    const formattedMonth = parseInt(month, 10);
    const formattedDay = parseInt(day, 10);
    return `${formattedDay}. ${formattedMonth}.`;
}
let supl = [];
async function fetchTableWithClassrooms(url, value) {
    supl = [];
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true
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
                        await setDataForClassrooms(page, `table:nth-of-type(3) tr:nth-of-type(${i + 1 + j})`,value,date);
                    }
                } else {
                    await setDataForClassrooms(page, `table:nth-of-type(3) tr:nth-of-type(${i + 1})`,value,date);
                }
            }
        }

        await browser.close()

    } catch (error) {
        throw (new Error(error))
    }

    return supl;

}
async function setDataForClassrooms(page, selector,classroom,date) {
    const dataForHour = {};

    const cellStyleC1 = await page.$$eval(`${selector} .CellStyle_C1`, elements => elements.map(el => el.textContent.trim()));
    dataForHour.den = formatDateWithDots(date);
    dataForHour.trida = cellStyleC1[cellStyleC1.length - 1];
    dataForHour.hodina = await page.$eval(`${selector} .CellStyle_C2`, el => el.textContent.trim());
    dataForHour.chybejici = cellStyleC1[cellStyleC1.length - 2];
    dataForHour.predmet = cellStyleC1[cellStyleC1.length - 3];

    const cellStyleC3 = await page.$$eval(`${selector} .CellStyle_C3`, elements => elements.map(el => el.textContent.trim()));
    dataForHour.ucebna = classroom;
    dataForHour.nahradni_ucebna = cellStyleC3[cellStyleC3.length - 2];


    dataForHour.poznamka = "";
    dataForHour.zastupujici = "";
    supl.push(dataForHour);
}
const fetchTableWithClasses= async (url, value) =>{
    supl = [];
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true
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
                        await setDataForClasses(page, `table:nth-of-type(2) tr:nth-of-type(${i + 1 + j})`,value,date);
                    }
                } else {
                    await setDataForClasses(page, `table:nth-of-type(2) tr:nth-of-type(${i + 1})`,value,date);
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
const setDataForClasses= async (page, selector,trida,date) => {
    const dataForHour = {};

    dataForHour.den = formatDateWithDots(date);
    dataForHour.trida = trida;
    dataForHour.hodina = await page.$eval(`${selector} .CellStyle_B2`, el => el.textContent.trim());
    dataForHour.chybejici = await page.$eval(`${selector} .CellStyle_B3`, el => el.textContent.trim());

    const cellStyleB1 = await page.$$eval(`${selector} .CellStyle_B1`, elements => elements.map(el => el.textContent.trim()));
    dataForHour.predmet = cellStyleB1[cellStyleB1.length - 4];
    dataForHour.ucebna = cellStyleB1[cellStyleB1.length - 3];
    dataForHour.nahradni_ucebna = cellStyleB1[cellStyleB1.length - 2];
    dataForHour.poznamka = cellStyleB1[cellStyleB1.length - 1];

    dataForHour.zastupujici = await page.$eval(`${selector} .CellStyle_B4`, el => el.textContent.trim());
    supl.push(dataForHour);
}

exports.AddSchedule = onSchedule({schedule:"0 0 1 1-6,9-12 *", memory:"8GiB", timeoutSeconds:3000, region:"europe-central2",timeZone:"CET"}, async (res,event) => {
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true
    });
    try {

    const scrapeClassesSchedule = async (grade)=>{
        const page = await browser.newPage();
        let schedule = [];

        try {
            await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/rozvrh/${grade}`);

            schedule = await page.$$eval('tr[height="107px"]', (elements) => {
                return elements.map((element) => {
                    const tdElements = element.querySelectorAll('td[class="CellStyle_2"]');

                    return Array.from(tdElements).flatMap((td) => {
                        const partsOfHour = td.querySelectorAll('td');

                        if(partsOfHour.length>0){
                            const lesson = Array.from(partsOfHour).map((part)=>{
                                const hasContent = part.textContent.trim() || part.querySelector('.StyleU2').textContent || part.querySelector('.StyleU3').textContent || part.querySelector('.StyleU4').textContent || part.querySelector('.StyleU5').textContent;
                                if(hasContent){
                                    const title = part.querySelector('.StyleU3').getAttribute("title")? part.querySelector('.StyleU3').getAttribute("title"): '';

                                    let surname ;
                                    if(title === "Bes = MRes Ondřej Beneš O."){
                                        surname= "Beneš O."
                                    }
                                    else {
                                        const parts = title.split(' ');
                                        const equalsIndex = parts.indexOf('=');
                                        const relevantParts = equalsIndex >= 0 ? parts.slice(equalsIndex + 1) : parts;
                                        const filteredParts = relevantParts.filter(word => !word.includes('.'));
                                        surname = filteredParts.length > 1 ? filteredParts[1] : null;
                                    }

                                    const hodina = part.querySelector('.StyleU2');
                                    const ucitel = part.querySelector('.StyleU3');
                                    const trida = part.querySelector('.StyleU4');
                                    const parta = part.querySelector('.StyleU5');
                                    return [hodina ? hodina.textContent : "", ucitel ? ucitel.textContent : '', trida ? trida.textContent : '', parta ? parta.textContent : '', surname ? surname : '']
                                }
                                else {
                                    return ["-","-","-","-","-"]
                                }
                            })

                            if(td.getAttribute('colspan')){
                                const colspanValue = parseInt(td.getAttribute('colspan'), 10);
                                return Array.from({ length: colspanValue }, () => lesson);
                            }else {
                                return [lesson]
                            }
                        }
                        else{
                            let hodina;
                            let ucitel;
                            let trida;
                            let parta;
                            let prijmeni;
                            return [[[hodina="-",ucitel="-",trida="-",parta="-",prijmeni="-"]]]
                        }
                    });
                });
            });
        }catch (error){
            throw (new Error(error))
        }finally {
            await page.close();
        }
        return schedule;
    }


    const scrapeTeachersSchedule = async (teacher)=>{
        const page = await browser.newPage();
        let schedule = [];

        try {
            await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/rozvrh/${teacher}`);
            schedule = await page.$$eval('tr[height="60px"]', (elements) => {
                return elements.map((element) => {
                    const tdElements = element.querySelectorAll('td[class="CellStyle_2"]');

                    return Array.from(tdElements).flatMap((td) => {
                        const partsOfHour = td.querySelectorAll('td');

                        if (partsOfHour.length>0){
                            const hodina = Array.from(partsOfHour).map((part)=>{
                                const hasContent = part.textContent.trim() || part.querySelector('.StyleU2').textContent || part.querySelector('.StyleU1').textContent || part.querySelector('.StyleU4').textContent || part.querySelector('.StyleU5').textContent;

                                if (hasContent){
                                    const hodina = part.querySelector('.StyleU2');
                                    const trida = part.querySelector('.StyleU1');
                                    const ucebna = part.querySelector('.StyleU4');
                                    const parta = part.querySelector('.StyleU5');
                                    return [hodina?hodina.textContent:'',trida?trida.textContent:'',ucebna? ucebna.textContent:'',parta? parta.textContent:'']
                                }else{
                                    return ["-","-","-","-"]
                                }
                            })
                            if(td.getAttribute('colspan')){
                                const colspanValue = parseInt(td.getAttribute('colspan'), 10);
                                return Array.from({ length: colspanValue }, () => hodina);
                            }else {
                                return [hodina]
                            }
                        }else{
                            let hodina;
                            let trida;
                            let ucebna;
                            let parta;
                            return [[[hodina="-",trida="-",ucebna="-",parta="-"]]]
                        }
                    });
                });
            });
        }catch (error){
            throw (new Error(error))
        }finally {
            await page.close();
        }
        return schedule;
    }

    const scrapeClasses = async ()=> {
        const page = await browser.newPage();

        let classes = [];
        try {
            await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Trida_Menu.html');

            classes = await page.$$eval('option', elements => {
                return Array.from(elements).map((el) => {
                    return el.getAttribute('value');
                })
            })
        } catch (error) {
            throw (new Error(error))
        } finally {
            await page.close();
        }
        return classes;
    }

    const scrapeTeachers = async ()=> {
        const page = await browser.newPage();

        let listOfTeachers = [];
        try {
            await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Vyucujici_Menu.html');

            listOfTeachers = await page.$$eval('option', elements => {
                return Array.from(elements).map((el) => {
                    return el.getAttribute('value');
                })
            })
        } catch (error) {
            throw (new Error(error))
        } finally {
            await page.close();
        }
        return listOfTeachers;
    }

        const listOfClasses = await scrapeClasses();
        for (const trida of listOfClasses) {
            const scrapedSchedule = await scrapeClassesSchedule(trida);
            const withoutExtension = trida.replace(/\.html$/, '');
            const result = withoutExtension.replace(/^rozvrh_Trida_/, '');
            const ref = database.ref(`rozvrh`);
            const usersRef = ref.child(result);
            await usersRef.set(scrapedSchedule)
        }

        const listOfTeachers = await scrapeTeachers();
        for (const teacher of listOfTeachers) {
            const scrapedSchedule = await scrapeTeachersSchedule(teacher);
            const withoutExtension = teacher.replace(/\.html$/, '');
            const result = withoutExtension.replace(/^rozvrh_Vyucujici_/, '');
            const ref = database.ref(`rozvrh`);
            const usersRef = ref.child(result);
            await usersRef.set(scrapedSchedule)
        }

        const page = await browser.newPage();
        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Trida_Menu.html');

        const classes = await page.$$eval('option', elements=>{
            return Array.from(elements).map((el)=>{
                const url = el.getAttribute('value');
                return url.split("Trida_")[1].split(".html")[0]
            })
        })

        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Vyucujici_Menu.html');
        const teachers = await page.$$eval('option', elements=>{
            return Array.from(elements).map((el)=>{
                return  el.textContent;
            })
        })

        const refClasses = database.ref(`tridy`);
        await refClasses.set(classes);

        const refTeachers = database.ref(`vyucujici`);
        await refTeachers.set(teachers);

    }catch (error){
        throw (new Error(error))
    }finally {
        await browser.close()
    }
})

exports.SubstituteTeachingSchedule =  onSchedule({schedule:"*/30 6-22 * 1-6,9-12 0-5", memory:"4GiB", timeoutSeconds:1200, region:"europe-central2", timeZone:"CET"}, async (res, event) => {
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true
    });
    try {
        const page = await browser.newPage();

        const underScoreDate = formatToUnderScoreDate(new Date());
        const dateUrls = await scrapeDataUrls();
        const url = `Sestava_pro_web_${underScoreDate}.html`;
        const todayDateIndex = dateUrls.findIndex(el => el === url);
        const datesForScrape = todayDateIndex !== -1 ? dateUrls.slice(0, todayDateIndex + 1) : [];

        for(const dayUrl of datesForScrape){
            const response = await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/${dayUrl}`, {
                waitUntil: 'networkidle2',
                timeout: 3000
            });

            if (!response || !response.ok()) {
                const status = response ? response.status() : 'Unknown';
                console.error(`HTTP error ${status} while navigating to ${dayUrl}`)
            }

            const absentTeachers = await page.evaluate(() => {
                const cells = document.querySelectorAll("table:nth-of-type(1) .cell");
                const indexOfTeachers = Array.from(cells).findIndex((cell) => cell.textContent.includes("Vyučující:"));
                const textWithTeachers = cells[indexOfTeachers+1].innerText
                return textWithTeachers
                    .split(",")
                    .map(item => item.trim())
                    .filter(item => item !== "");
            });

            const absentClasses = await page.evaluate(() => {
                const cells = document.querySelectorAll("table:nth-of-type(1) .cell");
                const indexOfCellClass = Array.from(cells).findIndex((cell) => cell.textContent.includes("Třída:"));
                if(indexOfCellClass===-1){
                    return []
                }
                const textWithClasses = cells[indexOfCellClass+1].innerText
                return textWithClasses
                    .split(",")
                    .map(item => item.trim())
                    .filter(item => item !== "");
            });

            function parseAbsentsToObject(input) {
                let regex;
                !isNaN(parseInt(input[0])) ?  regex = /^([a-zA-Z0-9]+(?:\s*-\s*[a-zA-Z0-9]+(?:\/[a-zA-Z0-9]+)?)?)\s*\(((?:\d+\.\.\d+|\d+)(?:,\s*(?:\d+\.\.\d+|\d+))*)\)$/:
                    regex = /^([\wÁÉÍÓÚŮÝČĎĚŇŘŠŤŽáéíóúůýčďěňřšťž\s.]+)\s*\(((?:\d+\.\.\d+|\d+)(?:,\s*(?:\d+\.\.\d+|\d+))*)\)$/;

                const inputSplit = input.match(regex);
                if (!inputSplit) {
                    throw new Error("Invalid format");
                }
                const name = inputSplit[1];
                const rangeOfNumbers = inputSplit[2];

                const numbers = [];
                rangeOfNumbers.split(',').forEach((rangeWithoutWhitespaces) => {
                    rangeWithoutWhitespaces = rangeWithoutWhitespaces.trim();
                    if (rangeWithoutWhitespaces.includes('..')) {
                        const [start, end] = rangeWithoutWhitespaces.split('..').map(Number);
                        for (let i = start; i <= end; i++) {
                            numbers.push(i);
                        }
                    } else {
                        numbers.push(Number(rangeWithoutWhitespaces));
                    }
                });

                return {label:name.split(" ")[0], numbers};
            }

            const findAbsentClassrooms = await page.evaluate(() => {

                const tables = document.querySelectorAll('table');
                let rows;
                if (tables.length >= 2) {
                    const secondLastTable = tables[tables.length - 2];
                    rows = secondLastTable.querySelectorAll('tbody tr');
                } else {
                    throw new Error("Not enough tables on the page.");
                }
                const classrooms = [];
                Array.from(rows).map(row=>{
                    const firstCell = row.querySelector('td:first-of-type');
                    if (firstCell && firstCell.classList.contains('CellStyle_C1')) {
                        classrooms.push(firstCell.innerText.replace(/\s+/g, '').split(",")) ;
                    }
                })
                const flattedTridy = classrooms.flat();
                const noDuplicates = new Set(flattedTridy);
                return [...noDuplicates];
            });

            const findAbsentClasses = await page.evaluate(() => {
                const rows = document.querySelectorAll('table:nth-of-type(2) tbody tr');
                const classes = [];
                Array.from(rows).map(row => {
                    const firstCell = row.querySelector('td:first-of-type');
                    if (firstCell && firstCell.classList.contains('CellStyle_B1')) {
                        classes.push(firstCell.innerText.replace(/\s+/g, '').split(","));
                    }
                })
                const flattedTridy = classes.flat();
                const noDuplicates = new Set(flattedTridy);
                return [...noDuplicates];
            });

            const absentData = [];

            for (const grade of findAbsentClasses) {
                const dataForAbsentClasses = await fetchTableWithClasses(`https://www.sps-tabor.cz/rozvrh-supl/${dayUrl}`, grade);
                absentData.push(dataForAbsentClasses);
            }
            for (const classroom of findAbsentClassrooms) {
                const result = await fetchTableWithClassrooms(`https://www.sps-tabor.cz/rozvrh-supl/${dayUrl}`, classroom);
                absentData.push(result);
            }

            const ref = database.ref(`suplovani`);
            const usersRef = ref.child(`${dayUrl.match(/(\d{4}_\d{2}_\d{2})/)[0]}`);
            await usersRef.set(absentData.flat(2))

            for (const absentClass of absentClasses) {
                await usersRef.push(parseAbsentsToObject(absentClass))
            }
            for (const absentTeacher of absentTeachers) {
                await usersRef.push(parseAbsentsToObject(absentTeacher))
            }
        }
    } catch (error) {
        console.error("Error details:", error);
        if (error instanceof Error) { 
            console.error(`Navigation error: ${error.message}`); 
        } else {
            console.error(`A non-Error object was thrown: ${JSON.stringify(error)}`); 
        }
        throw new Error("An error occurred during the process.");
    } finally {
        await browser.close();
    }
})

exports.KeepLatest10 = onSchedule({schedule:"0 0 * 1-6,9-12 0", memory:"4GiB", timeoutSeconds:1200, region:"europe-central2", timeZone:"CET"}, async (res,event) =>{
    try {
        const snapshot = await database.ref("suplovani").get();
        const data = snapshot.val();
        if (!data) {
            console.error("No data found")
        }
        const dates = Object.keys(data);
        const result = ()=>{
            if (dates.length > 10) {
                return dates.slice(0, dates.length - 10);
            }
            else {
                return [];
            }
        }
        const filesToDelete = result();
        const deletePromises = filesToDelete.map(id =>
            database.ref(`suplovani/${id}`).remove()
        );
        await Promise.all(deletePromises);

    } catch (error) {
        throw error;
    }
})