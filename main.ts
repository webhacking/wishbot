import puppeteer, {Page} from 'puppeteer';
import * as fs from 'fs';
import prompts from 'prompts';
import chalk from 'chalk';

const bootstrap = () => {
    const dirs = [
        'inprogress',
        'jobs'
    ];
    for (const dir of dirs) {
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
    }
};

const foundJobsNotify = (jobs: string[]) => {
  console.log(chalk.bgYellowBright(`${jobs.length}개 의 잡을 찾았긔`));
  for (const job of jobs) {
      console.log(`${chalk.red(job)}`);
  }
}

const submitJob = async (fno: string, jobId: string, page: Page) => {
    console.log(`${chalk.blue(jobId + '번호에 해당하는 잡에 지원하긔')}`)
    const price = await getPriceByJobId(jobId, page);
    const requestPrice = price * 80 / 100;

    console.log(`${chalk.blue(requestPrice + '만원으로 요청하긔 80% 해당 하는 금액이긔')}`);
    await page.goto(`https://www.freemoa.net/m4/project_apply?fno=${fno}&pno=${jobId}`, {waitUntil: 'networkidle0'});

    await page.click('.apply-history-btn');
    await page.waitFor(3000);
    await page.click('.layer-popup.apply.apply-history > div > table > tbody > tr:nth-child(1) > td.apply-tr');
    await page.waitFor(1000);
    await page.type('#costForFreeInput', requestPrice.toString());

    await page.click('.apply-portfolio-btn');
    await page.evaluate(() => Array.from(document.querySelectorAll('#portfolioList > li > div > div.port_check_wrap > label'), element => (element as HTMLElement).click()));
    await page.click('.add-portfolio-btn');

    await page.click('#projectApplyBtn');
    console.log('제출 했긔');

    await page.screenshot({path: `./jobs/${jobId}-${Date.toString()}.png`})
}

const getPriceByJobId = async (jobId: string, page: Page) => {
    await page.goto(`https://www.freemoa.net/m4/s41?pno=${jobId}&first_pno=${jobId}`, {waitUntil: 'networkidle0'});
    const price = await page.evaluate(() => (document.querySelector('.projectCostData') as HTMLElement).textContent)

    if ((price as string).includes("~")) {
        return Number((price as string).split('~')[1].replace(/\D/g,''));
    }

    return Number((price as string).replace(/\D/g,''));
};

(async () => {
    const {id, password} = await prompts([
        {
            type: 'text',
            name: 'id',
            message: '프리모아 아이디를 입력해주세요.'
        },
        {
            type: 'password',
            name: 'password',
            message: '프리모아 패스워드를 입력해주세요.'
        }
    ])

    bootstrap();

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto('https://www.freemoa.net/m0/s02', {waitUntil: 'networkidle0'});
    await page.type('#loginIdInput', id);
    await page.type('#loginPwInput', password);

    await Promise.all([
        page.click('#loginBtn'),
        page.waitForNavigation({waitUntil: 'networkidle0'}),
    ]);

    await page.screenshot({path: `./inprogress/sign-in-${Date.toString()}.png`})

    await page.goto('https://www.freemoa.net/m4/s41?page=1', {waitUntil: 'networkidle0'});
    const jobsTitle = await page.evaluate(() => Array.from(document.querySelectorAll('#projectList > li span.prjct-info-title-txt'), element => element.textContent));
    const jobsNums = await page.evaluate(() => Array.from(document.querySelectorAll('#projectList > li .proj-header > a'), element => element.getAttribute('data-star')));

    const fno = await page.evaluate(() => (document.getElementById('projectList') as HTMLElement).getAttribute('data-fno'))

    foundJobsNotify(jobsTitle as string[]);

    for (const jobsNum of jobsNums) {
        await submitJob(fno as string, jobsNum as string, page);
    }

    await browser.close()
})();
