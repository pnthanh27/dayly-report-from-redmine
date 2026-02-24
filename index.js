require('dotenv').config();
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function getActualTasks(link, targetDate) {
    const browser = await puppeteer.launch({ headless: true }); // Changed to headless: true for better automation
    const page = await browser.newPage();

    const dateStr = targetDate.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
    });

    try {
        // Login to Redmine
        await page.goto(link);
        await page.type('#username', process.env.REDMINE_USER || '');
        await page.type('#password', process.env.REDMINE_PASSWORD || '');
        await page.click('#login-submit');
        await page.waitForNavigation();

        // Navigate to the task log link
        await page.goto(link);
        
        // Extract basic info and links to issue details
        const entries = await page.evaluate((today) => {
            const rows = Array.from(document.querySelectorAll('tr.time-entry'));
            
            return rows
                .filter(row => {
                    const dateText = row.querySelector('td.spent_on')?.innerText.trim();
                    return dateText === today;
                })
                .map(row => {
                    const issueTd = row.querySelector('td.issue');
                    const issueText = issueTd?.innerText.trim() || '';
                    const issueLink = issueTd?.querySelector('a')?.href || null;
                    const comments = row.querySelector('td.comments')?.innerText.trim() || '';
                    return { issueText, issueLink, comments };
                });
        }, dateStr);

        const results = [];
        for (const entry of entries) {
            let progress = '0%';
            if (entry.issueLink) {
                const detailPage = await browser.newPage();
                await detailPage.goto(entry.issueLink);
                progress = await detailPage.evaluate(() => {
                    const percentElement = document.querySelector('p.percent');
                    return percentElement ? percentElement.innerText.trim() : '0%';
                });
                await detailPage.close();
            }
            const issueDisplay = entry.issueLink ? `<a href="${entry.issueLink}">${entry.issueText}</a>` : entry.issueText;
            results.push(`- ${issueDisplay}: ${entry.comments} (${progress})`);
        }

        const tasksOutput = results.join('\n');
        await browser.close();
        return tasksOutput || null;
    } catch (error) {
        console.error('Error fetching tasks:', error);
        await browser.close();
        return null;
    }
}

async function sendEmail(projectData, actualTasks, targetDate) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    let template = fs.readFileSync(path.join(__dirname, 'template.txt'), 'utf8');
    
    const issueAction = projectData.issue_action.length > 0 
        ? projectData.issue_action.map(i => `- ${i}`).join('\n') 
        : 'n/a';
    const nextPlan = projectData.next_plan.length > 0 
        ? projectData.next_plan.map(p => `- ${p}`).join('\n') 
        : 'n/a';

    let body = template
        .replace('{{dear}}', projectData.dear)
        .replace('{{actual_task}}', actualTasks)
        .replace('{{issue_action}}', issueAction)
        .replace('{{next_plan}}', nextPlan);
    // format today is dd/mm/yyyy
    const today = targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subject = projectData.subject.replace('{{date}}', today);
    const mailOptions = {
        from: projectData.from || process.env.EMAIL_USER,
        to: projectData.to,
        subject: subject,
        html: body.replace(/\r?\n/g, '<br>'),
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

async function main() {
    const dateArg = process.argv[2];
    let targetDate = new Date();
    if (dateArg && dateArg.toLowerCase() !== 'now') {
        const parsedDate = new Date(dateArg);
        if (!isNaN(parsedDate)) {
            targetDate = parsedDate;
        } else {
            console.error(`Invalid date provided: ${dateArg}. Using today's date instead.`);
        }
    }

    console.log(`Getting tasks for date: ${targetDate.toLocaleDateString('en-GB')}`);

    const projects = JSON.parse(fs.readFileSync(path.join(__dirname, 'project.json'), 'utf8'));

    for (const code in projects) {
        console.log(`Processing project: ${code}`);
        const projectData = projects[code];
        const actualTasks = await getActualTasks(projectData.link_log_task, targetDate);
        
        if (!actualTasks) {
            console.log(`No tasks logged for project ${code} on ${targetDate.toLocaleDateString('en-GB')}. Skipping email.`);
            continue;
        }

        await sendEmail(projectData, actualTasks, targetDate);
    }
}

main().catch(console.error);
