const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8082';

async function runFinalTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = [];
  
  // Helper function to test a route
  async function testRoute(name, route, checks) {
    const result = { name, route, status: 'PASS', checks: {} };
    
    try {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      const content = await page.evaluate(() => document.body.innerText);
      const html = await page.content();
      
      for (const [checkName, checkFn] of Object.entries(checks)) {
        result.checks[checkName] = checkFn(content, html) ? 'PASS' : 'FAIL';
      }
      
      // Check for error page
      if (content.includes('Something went wrong') || content.includes('Maximum update depth')) {
        result.status = 'FAIL';
        result.error = 'Infinite loop error detected';
      }
      
    } catch (err) {
      result.status = 'FAIL';
      result.error = err.message;
    }
    
    return result;
  }

  console.log('Running final pharmacy module tests...\n');

  // Test all routes
  const routes = [
    {
      name: 'Medicine List (tabs)',
      route: '/(tabs)/pharmacy',
      checks: {
        'no_infinite_loop': (c) => !c.includes('Maximum update depth'),
        'has_something': (c) => c.length > 50
      }
    },
    {
      name: 'Add Medicine (tabs)',
      route: '/(tabs)/pharmacy/add-medicine',
      checks: {
        'no_infinite_loop': (c) => !c.includes('Maximum update depth'),
        'has_something': (c) => c.length > 50
      }
    },
    {
      name: 'Medicine List (admin)',
      route: '/(admin)/pharmacy',
      checks: {
        'loads': (c) => !c.includes('Something went wrong'),
        'has_content': (c) => c.length > 100
      }
    },
    {
      name: 'Add Medicine (admin)',
      route: '/(admin)/pharmacy/add-medicine',
      checks: {
        'loads': (c) => !c.includes('Something went wrong'),
        'has_content': (c) => c.length > 100
      }
    },
    {
      name: 'Medicine List (pharmacist)',
      route: '/(pharmacist)/pharmacy',
      checks: {
        'loads': (c) => !c.includes('Something went wrong'),
        'has_content': (c) => c.length > 100
      }
    },
    {
      name: 'Add Medicine (pharmacist)',
      route: '/(pharmacist)/pharmacy/add-medicine',
      checks: {
        'loads': (c) => !c.includes('Something went wrong'),
        'has_content': (c) => c.length > 100
      }
    },
    {
      name: 'Login Page',
      route: '/login',
      checks: {
        'loads': (c) => !c.includes('Something went wrong'),
        'has_login_form': (c) => c.includes('Sign in') || c.includes('Email')
      }
    }
  ];

  for (const route of routes) {
    const result = await testRoute(route.name, route.route, route.checks);
    results.push(result);
  }

  // Print results
  console.log('\n========================================');
  console.log('       PHARMACY MODULE TEST RESULTS     ');
  console.log('========================================\n');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   Route: ${r.route}`);
    console.log(`   Status: ${r.status}`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
    for (const [check, status] of Object.entries(r.checks)) {
      const checkIcon = status === 'PASS' ? '✅' : '❌';
      console.log(`   ${checkIcon} ${check}: ${status}`);
    }
    console.log('');
    
    if (r.status === 'PASS') passCount++;
    else failCount++;
  }
  
  console.log('========================================');
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log('========================================');

  await browser.close();
  return results;
}

runFinalTests().catch(console.error);
