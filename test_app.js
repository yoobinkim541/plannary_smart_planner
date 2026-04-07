const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting Chrome...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    
    console.log("Navigating...");
    await page.goto('https://practice-todo-list-32af6.web.app/index.html', { waitUntil: 'networkidle0' });
    
    if (page.url().includes('login.html')) {
        console.log("Redirected to login. Attempting to login...");
        await page.type('#email', 'tester@example.com');
        await page.type('#password', 'password123'); // Assuming testing credentials
        // If it fails to login, sign up
        try {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }),
                page.click('button[type="submit"]')
            ]);
        } catch(e) {
            console.log("Login failed or no redirect. Navigating to signup...");
            await page.goto('https://practice-todo-list-32af6.web.app/signup.html', { waitUntil: 'networkidle0' });
            await page.type('#email', 'tester' + Date.now() + '@example.com');
            await page.type('#password', 'password123');
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle0' }),
                page.click('button[type="submit"]')
            ]);
        }
    }
    
    console.log("Currently at URL:", page.url());
    
    try {
        await page.waitForSelector('#todo-input', { timeout: 5000 });
        console.log("Selector found. Typing...");
        await page.type('#todo-input', 'My test task');
        await page.click('#add-btn');
        console.log("Clicked add btn");
        await new Promise(r => setTimeout(r, 4000));
        
        const html = await page.evaluate(() => {
            const list = document.getElementById('todo-list');
            return list ? list.innerHTML : 'no list';
        });
        console.log("TODO LIST HTML:", html);
    } catch(e) {
        console.log("Could not find/add task:", e.toString());
    }

    await browser.close();
})();
