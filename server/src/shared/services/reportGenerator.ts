import { PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'node:path';
import fs from 'node:fs';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';

handlebars.registerHelper('eq', function (a: unknown, b: unknown) {
  return a === b;
});
import { s3Client, S3_BUCKET, S3_PREFIX } from '../../config/s3.js';
import { s3Service } from './s3.service.js';

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
    const fileName = `${request.type}_${request.reportId}_${Date.now()}.pdf`;

    // 1. Resolve template path relative to this service file
    const templatePath = path.join(import.meta.dirname, '..', 'templates', `${request.type}.hbs`);

    // 2. Read and compile the Handlebars template
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateContent);
    const html = compiledTemplate(request.data);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env['PUPPETEER_EXECUTABLE_PATH']
        || (fs.existsSync('/usr/bin/chromium-browser') ? '/usr/bin/chromium-browser' : undefined)
        || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      });

      await page.close();

      // 4. Upload to S3 or fall back to local disk
      if (!S3_BUCKET) {
        const localDir = '/tmp/reports';
        fs.mkdirSync(localDir, { recursive: true });
        const localPath = path.join(localDir, fileName);
        fs.writeFileSync(localPath, pdfBuffer);
        return { fileKey: localPath, downloadUrl: localPath };
      }

      const fileKey = `${S3_PREFIX}reports/${fileName}`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: fileKey,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        }),
      );

      const downloadUrl = await s3Service.generateDownloadUrl(fileKey, 3600);
      return { fileKey, downloadUrl };
    } finally {
      await browser.close();
    }
  }
}

export const reportGenerator = ReportGenerator.getInstance();
