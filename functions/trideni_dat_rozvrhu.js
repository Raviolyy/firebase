const chromium = require('chrome-aws-lambda');

const scrapeTridy = async (trida)=>{
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true // Set to true for headless mode
    });
    const page = await browser.newPage();
    let dny = [];

    try {
        await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/rozvrh/${trida}`);
        //na dny (radky)
        dny = await page.$$eval('tr[height="107px"]', (elements) => {
            return elements.map((element) => {
                // na hodiny (po sloupcich)
                const tdElements = element.querySelectorAll('td[class="CellStyle_2"]');
                // pokud jsou rozdeleny na skupiny
                return Array.from(tdElements).flatMap((td) => {
                    const skupiny = td.querySelectorAll('td');
                    if(skupiny.length>0){
                        const hodina = Array.from(skupiny).map((skupina)=>{
                            const hasContent = skupina.textContent.trim() || skupina.querySelector('.StyleU2').textContent || skupina.querySelector('.StyleU3').textContent || skupina.querySelector('.StyleU4').textContent || skupina.querySelector('.StyleU5').textContent;
                            if(hasContent){
                                const title = skupina.querySelector('.StyleU3').getAttribute("title")? skupina.querySelector('.StyleU3').getAttribute("title"): '';
                                let prijmeni ;

                                if(title === "Bes = MRes Ondřej Beneš O."){
                                    prijmeni= "Beneš O."
                                }
                                else {
                                    const parts = title.split(' ');

                                    const equalsIndex = parts.indexOf('=');
                                    const relevantParts = equalsIndex >= 0 ? parts.slice(equalsIndex + 1) : parts;

                                    const filteredParts = relevantParts.filter(word => !word.includes('.'));

                                    prijmeni = filteredParts.length > 1 ? filteredParts[1] : null;

                                }

                                const hodina = skupina.querySelector('.StyleU2');
                                const ucitel = skupina.querySelector('.StyleU3');
                                const trida = skupina.querySelector('.StyleU4');
                                const parta = skupina.querySelector('.StyleU5');
                                return [hodina ? hodina.textContent : "", ucitel ? ucitel.textContent : '', trida ? trida.textContent : '', parta ? parta.textContent : '', prijmeni ? prijmeni : '']

                            }
                            else {
                                return ["-","-","-","-","-"]
                            }

                        })
                        //colspan
                        if(td.getAttribute('colspan')){
                            const colspanValue = parseInt(td.getAttribute('colspan'), 10);
                            return Array.from({ length: colspanValue }, () => hodina);
                        }else {
                            return [hodina]
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
        await browser.close();
    }
    return dny;
}

const scrapeVyucujici = async (vyucujici)=>{
    const browser = await chromium.puppeteer.launch({
        args: [...chromium.args],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true // Set to true for headless mode
    });
    const page = await browser.newPage();
    let dny = [];

    try {
        await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/rozvrh/${vyucujici}`);
        //na dny (radky)
        dny = await page.$$eval('tr[height="60px"]', (elements) => {
            return elements.map((element) => {
                // na hodiny (po sloupcich)
                const tdElements = element.querySelectorAll('td[class="CellStyle_2"]');
                // pokud jsou rozdeleny na skupiny
                return Array.from(tdElements).flatMap((td) => {
                    const skupiny = td.querySelectorAll('td');
                    if (skupiny.length>0){
                        const hodina = Array.from(skupiny).map((skupina)=>{
                            const hasContent = skupina.textContent.trim() || skupina.querySelector('.StyleU2').textContent || skupina.querySelector('.StyleU1').textContent || skupina.querySelector('.StyleU4').textContent || skupina.querySelector('.StyleU5').textContent;

                            if (hasContent){
                                const hodina = skupina.querySelector('.StyleU2');
                                const trida = skupina.querySelector('.StyleU1');
                                const ucebna = skupina.querySelector('.StyleU4');
                                const parta = skupina.querySelector('.StyleU5');

                                return [hodina?hodina.textContent:'',trida?trida.textContent:'',ucebna? ucebna.textContent:'',parta? parta.textContent:'']
                            }else{
                                return ["-","-","-","-"]

                            }

                        })
                        //colspan
                        if(td.getAttribute('colspan')){
                            const colspanValue = parseInt(td.getAttribute('colspan'), 10); // Get the colspan value and convert it to an integer
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
        await browser.close();
    }
    return dny;
}

const tridy = async ()=> {
    const browser = await chromium.puppeteer.launch({
        args : [...chromium.args],
        defaultViewport : chromium.defaultViewport,
        executablePath : await chromium.executablePath,
        headless : true // Set to true for headless mode
    });
    const page = await browser.newPage();

    let tridy = [];
    try {
        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Trida_Menu.html');

        tridy = await page.$$eval('option', elements => {
            return Array.from(elements).map((el) => {
                return el.getAttribute('value');
            })
        })
    } catch (error) {
        throw (new Error(error))
    } finally {
        await browser.close();
    }
    return tridy;
}

const vyucujici = async ()=> {
    const browser = await chromium.puppeteer.launch({
        args : [...chromium.args],
        defaultViewport : chromium.defaultViewport,
        executablePath : await chromium.executablePath,
        headless : true // Set to true for headless mode
    });
    const page = await browser.newPage();

    let vyucujici = [];
    try {
        await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Vyucujici_Menu.html');

        vyucujici = await page.$$eval('option', elements => {
            return Array.from(elements).map((el) => {
                return el.getAttribute('value');
            })
        })
    } catch (error) {
        throw (new Error(error))
    } finally {
        await browser.close();
    }
    return vyucujici;
}

exports.scrapeTridy = scrapeTridy;
exports.tridy = tridy;
exports.vyucujici = vyucujici;
exports.scrapeVyucujici = scrapeVyucujici;

