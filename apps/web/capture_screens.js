import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // -------------------------------------------------------------
  // 1. Desktop: Admin Overview
  // -------------------------------------------------------------
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopCtx.newPage();

  console.log('1. Navigating to Login as Admin...');
  await desktopPage.goto('http://localhost/login');
  await desktopPage.waitForTimeout(500);
  await desktopPage.click('button:has-text("Admin")');
  await desktopPage.waitForURL('http://localhost/', { timeout: 10000 });
  await desktopPage.waitForTimeout(1000);

  await desktopPage.screenshot({ 
    path: '/Users/poppy.geidtiphong/.gemini/antigravity/brain/c4fca2aa-6398-4ce1-a377-173a05f2126b/desktop_admin_overview.png' 
  });
  console.log('Saved desktop_admin_overview.png');

  // -------------------------------------------------------------
  // 2. Desktop: Staff Slide-over Drawer
  // -------------------------------------------------------------
  console.log('2. Logging in as Staff and opening Slideover...');
  await desktopPage.goto('http://localhost/login');
  await desktopPage.waitForTimeout(500);
  await desktopPage.click('button:has-text("CS Staff")');
  await desktopPage.waitForURL('http://localhost/', { timeout: 10000 });
  await desktopPage.waitForTimeout(1000);

  // Click row or "ดู & แนบไฟล์" button
  await desktopPage.click('table tbody tr:first-child button');
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ 
    path: '/Users/poppy.geidtiphong/.gemini/antigravity/brain/c4fca2aa-6398-4ce1-a377-173a05f2126b/desktop_staff_slideover.png' 
  });
  console.log('Saved desktop_staff_slideover.png');

  // -------------------------------------------------------------
  // 3. Desktop: Viewer Read-only (2 menus, no upload)
  // -------------------------------------------------------------
  console.log('3. Logging in as Viewer...');
  await desktopPage.goto('http://localhost/login');
  await desktopPage.waitForTimeout(500);
  await desktopPage.click('button:has-text("Viewer")');
  await desktopPage.waitForURL('http://localhost/', { timeout: 10000 });
  await desktopPage.waitForTimeout(1000);

  await desktopPage.click('table tbody tr:first-child button');
  await desktopPage.waitForTimeout(600);
  await desktopPage.screenshot({ 
    path: '/Users/poppy.geidtiphong/.gemini/antigravity/brain/c4fca2aa-6398-4ce1-a377-173a05f2126b/desktop_viewer_readonly.png' 
  });
  console.log('Saved desktop_viewer_readonly.png');

  await desktopCtx.close();

  // -------------------------------------------------------------
  // 4. Mobile: Staff Touch Cards (390 x 844 iPhone Viewport)
  // -------------------------------------------------------------
  console.log('4. Testing Mobile Viewport as Staff...');
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();

  await mobilePage.goto('http://localhost/login');
  await mobilePage.waitForTimeout(500);
  await mobilePage.click('button:has-text("CS Staff")');
  await mobilePage.waitForURL('http://localhost/', { timeout: 10000 });
  await mobilePage.waitForTimeout(1000);

  await mobilePage.screenshot({ 
    path: '/Users/poppy.geidtiphong/.gemini/antigravity/brain/c4fca2aa-6398-4ce1-a377-173a05f2126b/mobile_staff_cards.png' 
  });
  console.log('Saved mobile_staff_cards.png');

  // -------------------------------------------------------------
  // 5. Mobile: Staff Bottom Sheet
  // -------------------------------------------------------------
  console.log('5. Opening Mobile Bottom Sheet...');
  await mobilePage.click('.md\\:hidden button:has-text("+ ดู & แนบไฟล์")');
  await mobilePage.waitForTimeout(600);

  await mobilePage.screenshot({ 
    path: '/Users/poppy.geidtiphong/.gemini/antigravity/brain/c4fca2aa-6398-4ce1-a377-173a05f2126b/mobile_staff_bottom_sheet.png' 
  });
  console.log('Saved mobile_staff_bottom_sheet.png');

  await mobileCtx.close();
  await browser.close();
  console.log('All real live verification screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
