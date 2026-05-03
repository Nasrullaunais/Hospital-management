import path from 'node:path';
import fs from 'node:fs';
import handlebars from 'handlebars';
import puppeteer, { type Browser } from 'puppeteer';
import { logger } from '../utils/logger.js';

handlebars.registerHelper('eq', function (a: unknown, b: unknown) {
  return a === b;
});
import { s3Client, S3_BUCKET, S3_PREFIX } from '../../config/s3.js';
import { s3Service } from './s3.service.js';
import { env } from '../../config/env.js';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReportRequest {
  type: 'lab-report' | 'prescription' | 'medical-certificate';
  data: Record<string, unknown>;
  patientId: string;
  reportId: string;
}

export interface ReportResult {
  fileKey: string;
  downloadUrl: string;
}

// ── ReportGenerator ────────────────────────────────────────────────────────────

export class ReportGenerator {
  private static instance: ReportGenerator;

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator();
    }
    return ReportGenerator.instance;
  }

  /**
   * Generate a PDF report from a Handlebars template, upload to S3 (or save locally),
   * and return both the file key and a presigned download URL.
   */
  async generateReport(request: ReportRequest): Promise<ReportResult> {
    const startTime = Date.now();
    const fileName = `${request.type}_${request.reportId}_${Date.now()}.pdf`;

    logger.info({ event: 'pdf_render_started', reportType: request.type, reportId: request.reportId }, 'Starting PDF rendering');

    // 1. Resolve template path relative to this service file
    const templatePath = path.join(import.meta.dirname, '..', 'templates', `${request.type}.hbs`);

    // 2. Read and compile the Handlebars template
    let templateContent: string;
    try {
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }
      templateContent = fs.readFileSync(templatePath, 'utf-8');
    } catch (err) {
      logger.error({ event: 'pdf_render_error', reportType: request.type, err }, 'Failed to read template');
      throw err;
    }

    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate(request.data);

    if (!html || html.trim().length === 0) {
      logger.error({ event: 'pdf_render_error', reportType: request.type, err: new Error('Compiled HTML is empty') }, 'Compiled HTML is empty');
      throw new Error('Compiled HTML is empty');
    }

    logger.debug({ event: 'template_compiled', reportType: request.type }, 'Template compiled');

    let browser: Browser | null = null;
    try {
      logger.debug({ event: 'browser_launching' }, 'Launching puppeteer browser');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: env.PUPPETEER_EXECUTABLE_PATH
          || (fs.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : undefined)
          || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
        protocolTimeout: 60000,
        dumpio: false,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
      });
      logger.debug({ event: 'browser_launched' }, 'Browser launched');

      const page = await browser.newPage();
      page.setDefaultTimeout(30000);
      page.setDefaultNavigationTimeout(30000);

      let pdfBuffer: Buffer;
      try {
        logger.debug({ event: 'pdf_render_started', reportType: request.type }, 'Rendering PDF');
        await page.setContent(html, { waitUntil: 'networkidle0' });

        pdfBuffer = Buffer.from(await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm',
          },
        }));

        logger.debug({ event: 'pdf_render_completed', reportType: request.type, pdfSizeBytes: pdfBuffer.length }, 'PDF rendered');
      } finally {
        await page.close();
      }

      const fileKey = `${S3_PREFIX}reports/${fileName}`;

      if (s3Client) {
        // Upload to S3 via s3Service
        await s3Service.uploadBuffer(fileKey, pdfBuffer, 'application/pdf');

        logger.info({ event: 'pdf_uploaded', reportType: request.type, fileKey, s3Bucket: S3_BUCKET }, 'PDF stored in S3');

        const downloadUrl = await s3Service.generateDownloadUrl(fileKey);
        logger.info({ event: 'pdf_render_completed', reportType: request.type, reportId: request.reportId, durationMs: Date.now() - startTime }, 'PDF rendering completed');
        return { fileKey, downloadUrl };
      }

      // Fallback: store locally when S3 is not configured
      const localDir = path.join(import.meta.dirname, '..', '..', '..', 'uploads', 'reports');
      fs.mkdirSync(localDir, { recursive: true });
      const localPath = path.join(localDir, fileName);
      fs.writeFileSync(localPath, pdfBuffer);
      logger.info({ event: 'pdf_stored_local', reportType: request.type, fileKey: fileName, storageType: 'local' }, 'PDF stored locally (no S3)');
      logger.info({ event: 'pdf_render_completed', reportType: request.type, reportId: request.reportId, durationMs: Date.now() - startTime }, 'PDF rendering completed');
      return { fileKey: fileName, downloadUrl: `/uploads/reports/${fileName}` };
    } catch (err) {
      logger.error({ event: 'pdf_render_error', reportType: request.type, err }, 'PDF rendering failed');
      throw err;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Health check to verify Puppeteer/Chromium is available.
   */
  async isPuppeteerHealthy(): Promise<boolean> {
    let browser: Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        executablePath: env.PUPPETEER_EXECUTABLE_PATH
          || (fs.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : undefined)
          || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
        protocolTimeout: 30000,
        dumpio: true,
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
      });
      return true;
    } catch (err) {
      logger.warn({ event: 'puppeteer_health_check_failed', err }, 'Puppeteer health check failed');
      return false;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export const reportGenerator = ReportGenerator.getInstance();