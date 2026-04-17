const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8082';

async function runDetailedTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleMessages = [];
  const networkErrors = [];
  
  // Capture all console messages
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  
  page.on('pageerror', err => {
    consoleMessages.push({ type: 'pageerror', text: err.message });
  });

  page.on('requestfailed', request => {
    networkErrors.push(`Failed: ${request.url()} - ${request.failure().errorText}`);
  });

  // Test Medicine List Screen (tabs) - detailed
  console.log('\n=== DETAILED ANALYSIS: Medicine List Screen (tabs) ===');
  await page.goto(`${BASE_URL}/(tabs)/pharmacy`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const html = await page.content();
  console.log('Page HTML length:', html.length);
  
  // Check what React renders
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\nBody text content:');
  console.log('---');
  console.log(bodyText.substring(0, 1000));
  console.log('---');
  
  // Check for specific elements
  const inputs = await page.locator('input').count();
  const buttons = await page.locator('button').count();
  const texts = await page.locator('text').count();
  
  console.log(`\nElements found: inputs=${inputs}, buttons=${buttons}, text elements=${texts}`);
  
  // Test Add Medicine Screen
  console.log('\n=== DETAILED ANALYSIS: Add Medicine Screen ===');
  await page.goto(`${BASE_URL}/(tabs)/pharmacy/add-medicine`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  const addBodyText = await page.evaluate(() => document.body.innerText);
  console.log('\nBody text content:');
  console.log('---');
  console.log(addBodyText.substring(0, 1000));
  console.log('---');
  
  // Print console errors summary
  console.log('\n=== CONSOLE ERRORS SUMMARY ===');
  const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
  errors.forEach(e => {
    const truncated = e.text.length > 200 ? e.text.substring(0, 200) + '...' : e.text;
    console.log(`[${e.type}] ${truncated}`);
  });
  
  console.log(`\nTotal errors: ${errors.length}`);
  console.log(`Total network failures: ${networkErrors.length}`);
  networkErrors.forEach(n => console.log(`  - ${n}`));

  await browser.close();
}

runDetailedTests().catch(console.error);
