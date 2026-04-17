const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8082';

async function testLoginAndPharmacy() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', err => {
    consoleErrors.push('Page Error: ' + err.message);
  });

  console.log('=== Testing Login Flow ===');
  
  // Test 1: Login page
  console.log('\n[TEST 1] Login page:');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  const loginBody = await page.evaluate(() => document.body.innerText);
  console.log('Login page content:', loginBody.substring(0, 500));
  
  // Test 2: Try to fill login form
  console.log('\n[TEST 2] Trying to login:');
  const emailInput = page.locator('input').first();
  const passwordInput = page.locator('input[type="password"]').first();
  
  if (await emailInput.isVisible()) {
    console.log('Email input found, filling...');
    await emailInput.fill('admin@hospital.com');
    await passwordInput.fill('admin123');
    
    const submitBtn = page.locator('button').first();
    if (await submitBtn.isVisible()) {
      console.log('Submit button found, clicking...');
      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
  } else {
    console.log('Email input not visible');
  }
  
  // Test 3: Check current URL and content after login
  console.log('\n[TEST 3] After login attempt:');
  console.log('URL:', page.url());
  const afterLoginBody = await page.evaluate(() => document.body.innerText);
  console.log('Content:', afterLoginBody.substring(0, 500));
  
  // Test 4: Try pharmacy pages directly after login attempt
  console.log('\n[TEST 4] Testing pharmacy pages:');
  
  const routes = [
    '/(tabs)/pharmacy',
    '/(tabs)/pharmacy/add-medicine',
    '/(admin)/pharmacy',
    '/(admin)/pharmacy/add-medicine',
    '/(pharmacist)/pharmacy',
    '/(pharmacist)/pharmacy/add-medicine',
  ];
  
  for (const route of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const content = await page.evaluate(() => document.body.innerText);
    const hasError = content.includes('Something went wrong') || content.includes('Error');
    console.log(`  ${route}: ${hasError ? 'ERROR' : 'OK'}`);
    if (hasError) {
      console.log(`    Error content: ${content.substring(0, 200)}`);
    }
  }
  
  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length > 0) {
    consoleErrors.forEach((e, i) => console.log(`${i+1}. ${e.substring(0, 300)}`));
  } else {
    console.log('No console errors');
  }
  
  await browser.close();
}

testLoginAndPharmacy().catch(console.error);
