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
    const templatePath = path.join(__dirname, '..', '..', '..', 'src', 'templates', 'proposal.html');
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
        quantity: parseFloat(item.quantity.toString()),
        unitPrice: parseFloat(item.unitPrice.toString()),
        totalPrice: (parseFloat(item.quantity.toString()) * parseFloat(item.unitPrice.toString())).toFixed(2),
      })),
      subtotal: parseFloat(proposal.subtotal.toString()).toFixed(2),
      taxAmount: parseFloat(proposal.taxAmount.toString()).toFixed(2),
      discountAmount: parseFloat(proposal.discountAmount.toString()).toFixed(2),
      totalAmount: parseFloat(proposal.totalAmount.toString()).toFixed(2),
      taxPercent: parseFloat(proposal.taxPercent.toString()),
      discountPercent: parseFloat(proposal.discountPercent.toString()),
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