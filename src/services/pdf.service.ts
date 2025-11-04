import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Proposal } from '../entities';

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private browser: puppeteer.Browser | null = null;
  private readonly logger = new Logger(PdfService.name);

  async onModuleInit() {
    // Try to initialize browser on module startup, but do not crash the app if
    // Chrome is not available (common in minimal cloud containers).
    // We'll attempt a lazy initialization when a PDF is requested.
    if (process.env.DISABLE_PUPPETEER_ON_STARTUP === 'true') {
      this.logger.log('Puppeteer startup disabled by DISABLE_PUPPETEER_ON_STARTUP');
      return;
    }

    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log('Puppeteer browser initialized');
    } catch (err: any) {
      // Don't let Puppeteer failures crash the whole application. Log and continue.
      this.browser = null;
      this.logger.warn(`Puppeteer failed to launch on startup: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    // Close browser on module shutdown
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generateProposalPdf(proposal: Proposal): Promise<Buffer> {
    // Lazy-initialize the browser if it wasn't started during module init.
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        this.logger.log('Puppeteer browser lazily initialized for PDF generation');
      } catch (err: any) {
        this.logger.error(`Unable to initialize Puppeteer for PDF generation: ${err?.message || err}`);
        throw new Error('PDF generation is currently unavailable in this environment.');
      }
    }

    // Read HTML template
    const templatePath = path.join(process.cwd(), 'src', 'templates', 'proposal.html');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);

    // Prepare template data
    const templateData = {
      proposalNumber: proposal.proposalNumber,
      lead: proposal.lead ? {
        name: proposal.lead.name || 'N/A',
        organization: proposal.lead.organization || 'N/A',
        email: proposal.lead.email || 'N/A',
        phone: proposal.lead.phone || 'N/A',
      } : {
        name: 'N/A',
        organization: 'N/A',
        email: 'N/A',
        phone: 'N/A',
      },
      createdDate: new Date(proposal.createdDate).toLocaleDateString(),
      validUntil: proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : null,
      items: (proposal.items || []).map(item => ({
        ...item,
        quantity: parseFloat(item.quantity?.toString() || '0'),
        unitPrice: parseFloat(item.unitPrice?.toString() || '0'),
        totalPrice: (parseFloat(item.quantity?.toString() || '0') * parseFloat(item.unitPrice?.toString() || '0')).toFixed(2),
      })),
      subtotal: parseFloat(proposal.subtotal?.toString() || '0').toFixed(2),
      taxAmount: parseFloat(proposal.taxAmount?.toString() || '0').toFixed(2),
      discountAmount: parseFloat(proposal.discountAmount?.toString() || '0').toFixed(2),
      totalAmount: parseFloat(proposal.totalAmount?.toString() || '0').toFixed(2),
      taxPercent: parseFloat(proposal.taxPercent?.toString() || '0'),
      discountPercent: parseFloat(proposal.discountPercent?.toString() || '0'),
      termsAndConditions: proposal.termsAndConditions || 'Standard terms and conditions apply.',
    };

    // Generate HTML
    const html = template(templateData);

    // Create PDF
    const page = await this.browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in',
      },
    });

    await page.close();
    return Buffer.from(pdfBuffer);
  }
}