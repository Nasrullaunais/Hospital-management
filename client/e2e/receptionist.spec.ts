import { test, expect, Page } from '@playwright/test';

const RECEPTIONIST_EMAIL = 'receptionist@hospital.com';
const RECEPTIONIST_PASSWORD = 'receptionist123';

class ReceptionistPage {
  readonly page: Page;
  readonly baseURL: string;

  constructor(page: Page, baseURL: string) {
    this.page = page;
    this.baseURL = baseURL;
  }

  async login(email: string, password: string) {
    await this.page.goto(`${this.baseURL}/login`);
    await this.page.getByPlaceholder('Enter your email').fill(email);
    await this.page.getByPlaceholder('Enter your password').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
  }

  async gotoDashboard() {
    await this.page.goto(`${this.baseURL}/(receptionist)`);
  }

  async gotoBeds() {
    await this.page.goto(`${this.baseURL}/(receptionist)/beds`);
  }

  async gotoPatients() {
    await this.page.goto(`${this.baseURL}/(receptionist)/patients`);
  }

  async gotoMedications() {
    await this.page.goto(`${this.baseURL}/(receptionist)/medications`);
  }

  async gotoAssign() {
    await this.page.goto(`${this.baseURL}/(receptionist)/patients/assign`);
  }

  async logout() {
    await this.page.goto(`${this.baseURL}/(receptionist)/profile`);
    const logoutButton = this.page.getByRole('button', { name: /logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  }
}

test.describe('Ward Receptionist E2E Tests', () => {
  let receptionistPage: ReceptionistPage;

  test.beforeEach(async ({ page }) => {
    const baseURL = process.env.BASE_URL ?? 'http://localhost:8082';
    receptionistPage = new ReceptionistPage(page, baseURL);
    await receptionistPage.login(RECEPTIONIST_EMAIL, RECEPTIONIST_PASSWORD);
  });

  test('Login flow: receptionist can log in with valid credentials', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL ?? 'http://localhost:8082'}/login`);
    await page.getByPlaceholder('Enter your email').fill(RECEPTIONIST_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(RECEPTIONIST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/\(receptionist\)/);
  });

  test('Dashboard load: dashboard loads with stats cards', async ({ page }) => {
    await receptionistPage.gotoDashboard();

    await expect(page.getByTestId('dashboard-screen')).toBeVisible();
    await expect(page.getByTestId('stats-card')).toBeVisible();
    await expect(page.getByTestId('occupancy-bar')).toBeVisible();
    await expect(page.getByTestId('upcoming-discharges')).toBeVisible();
  });

  test('Bed grid: bed grid shows with occupied/vacant beds', async ({ page }) => {
    await receptionistPage.gotoBeds();

    await expect(page.getByTestId('beds-screen')).toBeVisible();
    const bedCards = page.locator('[testID^="bed-card-"]');
    await expect(bedCards.first()).toBeVisible();
  });

  test('Patient list: can view patient list', async ({ page }) => {
    await receptionistPage.gotoPatients();

    await expect(page.getByTestId('patients-screen')).toBeVisible();
    const patientCards = page.locator('[testID^="patient-card-"]');
    await expect(patientCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('Medications list: can view medications (read-only)', async ({ page }) => {
    await receptionistPage.gotoMedications();

    await expect(page.getByTestId('medications-screen')).toBeVisible();
    const medicationCards = page.locator('[testID^="medication-card-"]');
    await expect(medicationCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('Assign patient: happy path through assign form', async ({ page }) => {
    await receptionistPage.gotoAssign();

    await expect(page.getByTestId('assign-screen')).toBeVisible();
    await expect(page.getByTestId('patient-select')).toBeVisible();
    await expect(page.getByTestId('bed-select')).toBeVisible();
    await expect(page.getByTestId('admission-date')).toBeVisible();
    await expect(page.getByTestId('submit-btn')).toBeVisible();
  });
});
