// const chromium = require('chrome-aws-lambda');
//
// const scrapeClassesSchedule = async (grade, browser)=>{
//     const page = await browser.newPage();
//     let schedule = [];
//
//     try {
//         await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/rozvrh/${grade}`);
//
//         schedule = await page.$$eval('tr[height="107px"]', (elements) => {
//             return elements.map((element) => {
//                 const tdElements = element.querySelectorAll('td[class="CellStyle_2"]');
//
//                 return Array.from(tdElements).flatMap((td) => {
//                     const partsOfHour = td.querySelectorAll('td');
//
//                     if(partsOfHour.length>0){
//                         const lesson = Array.from(partsOfHour).map((part)=>{
//                             const hasContent = part.textContent.trim() || part.querySelector('.StyleU2').textContent || part.querySelector('.StyleU3').textContent || part.querySelector('.StyleU4').textContent || part.querySelector('.StyleU5').textContent;
//                             if(hasContent){
//                                 const title = part.querySelector('.StyleU3').getAttribute("title")? part.querySelector('.StyleU3').getAttribute("title"): '';
//
//                                 let surname ;
//                                 if(title === "Bes = MRes Ondřej Beneš O."){
//                                     surname= "Beneš O."
//                                 }
//                                 else {
//                                     const parts = title.split(' ');
//                                     const equalsIndex = parts.indexOf('=');
//                                     const relevantParts = equalsIndex >= 0 ? parts.slice(equalsIndex + 1) : parts;
//                                     const filteredParts = relevantParts.filter(word => !word.includes('.'));
//                                     surname = filteredParts.length > 1 ? filteredParts[1] : null;
//                                 }
//
//                                 const hodina = part.querySelector('.StyleU2');
//                                 const ucitel = part.querySelector('.StyleU3');
//                                 const trida = part.querySelector('.StyleU4');
//                                 const parta = part.querySelector('.StyleU5');
//                                 return [hodina ? hodina.textContent : "", ucitel ? ucitel.textContent : '', trida ? trida.textContent : '', parta ? parta.textContent : '', surname ? surname : '']
//                             }
//                             else {
//                                 return ["-","-","-","-","-"]
//                             }
//                         })
//
//                         if(td.getAttribute('colspan')){
//                             const colspanValue = parseInt(td.getAttribute('colspan'), 10);
//                             return Array.from({ length: colspanValue }, () => lesson);
//                         }else {
//                             return [lesson]
//                         }
//                     }
//                     else{
//                         let hodina;
//                         let ucitel;
//                         let trida;
//                         let parta;
//                         let prijmeni;
//                         return [[[hodina="-",ucitel="-",trida="-",parta="-",prijmeni="-"]]]
//                     }
//                 });
//             });
//         });
//     }catch (error){
//         throw (new Error(error))
//     }finally {
//         await page.close();
//     }
//     return schedule;
// }
//
// const scrapeTeachersSchedule = async (teacher)=>{
//     const browser = await chromium.puppeteer.launch({
//         args: [...chromium.args],
//         defaultViewport: chromium.defaultViewport,
//         executablePath: await chromium.executablePath,
//         headless: true // Set to true for headless mode
//     });
//     const page = await browser.newPage();
//     let schedule = [];
//
//     try {
//         await page.goto(`https://www.sps-tabor.cz/rozvrh-supl/rozvrh/${teacher}`);
//         schedule = await page.$$eval('tr[height="60px"]', (elements) => {
//             return elements.map((element) => {
//                 const tdElements = element.querySelectorAll('td[class="CellStyle_2"]');
//
//                 return Array.from(tdElements).flatMap((td) => {
//                     const partsOfHour = td.querySelectorAll('td');
//
//                     if (partsOfHour.length>0){
//                         const hodina = Array.from(partsOfHour).map((part)=>{
//                             const hasContent = part.textContent.trim() || part.querySelector('.StyleU2').textContent || part.querySelector('.StyleU1').textContent || part.querySelector('.StyleU4').textContent || part.querySelector('.StyleU5').textContent;
//
//                             if (hasContent){
//                                 const hodina = part.querySelector('.StyleU2');
//                                 const trida = part.querySelector('.StyleU1');
//                                 const ucebna = part.querySelector('.StyleU4');
//                                 const parta = part.querySelector('.StyleU5');
//                                 return [hodina?hodina.textContent:'',trida?trida.textContent:'',ucebna? ucebna.textContent:'',parta? parta.textContent:'']
//                             }else{
//                                 return ["-","-","-","-"]
//                             }
//                         })
//                         if(td.getAttribute('colspan')){
//                             const colspanValue = parseInt(td.getAttribute('colspan'), 10);
//                             return Array.from({ length: colspanValue }, () => hodina);
//                         }else {
//                             return [hodina]
//                         }
//                     }else{
//                         let hodina;
//                         let trida;
//                         let ucebna;
//                         let parta;
//                         return [[[hodina="-",trida="-",ucebna="-",parta="-"]]]
//                     }
//                 });
//             });
//         });
//     }catch (error){
//         throw (new Error(error))
//     }finally {
//         await browser.close();
//     }
//     return schedule;
// }
//
// const scrapeClasses = async ()=> {
//     const browser = await chromium.puppeteer.launch({
//         args : [...chromium.args],
//         defaultViewport : chromium.defaultViewport,
//         executablePath : await chromium.executablePath,
//         headless : true
//     });
//     const page = await browser.newPage();
//
//     let classes = [];
//     try {
//         await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Trida_Menu.html');
//
//         classes = await page.$$eval('option', elements => {
//             return Array.from(elements).map((el) => {
//                 return el.getAttribute('value');
//             })
//         })
//     } catch (error) {
//         throw (new Error(error))
//     } finally {
//         await browser.close();
//     }
//     return classes;
// }
//
// const scrapeTeachers = async ()=> {
//     const browser = await chromium.puppeteer.launch({
//         args : [...chromium.args],
//         defaultViewport : chromium.defaultViewport,
//         executablePath : await chromium.executablePath,
//         headless : true
//     });
//     const page = await browser.newPage();
//
//     let listOfTeachers = [];
//     try {
//         await page.goto('https://www.sps-tabor.cz/rozvrh-supl/rozvrh/rozvrh_Vyucujici_Menu.html');
//
//         listOfTeachers = await page.$$eval('option', elements => {
//             return Array.from(elements).map((el) => {
//                 return el.getAttribute('value');
//             })
//         })
//     } catch (error) {
//         throw (new Error(error))
//     } finally {
//         await browser.close();
//     }
//     return listOfTeachers;
// }
//
// exports.listOfClassesSchedule = scrapeClassesSchedule;
// exports.listOfTeachersSchedule = scrapeTeachersSchedule;
// exports.listOfClasses = scrapeClasses;
// exports.listOfTeachers = scrapeTeachers;
//
