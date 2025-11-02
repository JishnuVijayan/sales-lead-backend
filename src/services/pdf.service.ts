import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Proposal } from '../entities';

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private browser: puppeteer.Browser | null = null;

  async onModuleInit() {
    // Initialize browser on module startup
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy() {
    // Close browser on module shutdown
    if (this.browser) {
      await this.browser.close();
    }
  }

  async generateProposalPdf(proposal: Proposal): Promise<Buffer> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    // Read HTML template
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'proposal.html');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);

    // Prepare template data
    const templateData = {
      proposalNumber: proposal.proposalNumber,
      lead: proposal.lead,
      createdDate: new Date(proposal.createdDate).toLocaleDateString(),
      validUntil: proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : null,
      items: proposal.items.map(item => ({
        ...item,
        totalPrice: (item.quantity * item.unitPrice).toFixed(2),
      })),
      subtotal: proposal.subtotal.toFixed(2),
      taxAmount: proposal.taxAmount.toFixed(2),
      discountAmount: proposal.discountAmount.toFixed(2),
      totalAmount: proposal.totalAmount.toFixed(2),
      taxPercent: proposal.taxPercent,
      discountPercent: proposal.discountPercent,
      termsAndConditions: proposal.termsAndConditions,
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