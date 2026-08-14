import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/components/pdf/InvoicePDF';
import { getInvoiceById, getClinicSettings } from '@/app/actions/billing';
import { getSaleById } from '@/app/actions/sale';
import { getCurrentUserRole } from '@/lib/auth-utils';
import { hasAccess } from '@/lib/permissions';
import React from 'react';

// Force dynamic generation
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, role } = await getCurrentUserRole();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!hasAccess(role, 'billing', 'read') && !hasAccess(role, 'pharmacy', 'read')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const resolvedParams = await params;
    
    // First try fetching as a Sale (for rich distributor format), otherwise as an Invoice
    const [sale, invoice, settings] = await Promise.all([
      getSaleById(resolvedParams.id),
      getInvoiceById(resolvedParams.id),
      getClinicSettings(),
    ]);

    const targetDoc = sale || invoice;

    if (!targetDoc) {
      return new NextResponse('Invoice / Sale record not found', { status: 404 });
    }

    const doc = targetDoc as any;
    const docNo = doc.saleNo || doc.invoiceNo || 'INV';
    const url = new URL(request.url);
    const logoUrl = `${url.protocol}//${url.host}/logo.jpeg`;

    // Render the React-PDF component to a Node stream
    const pdfStream = await renderToStream(
      <InvoicePDF invoice={targetDoc} settings={settings} logoUrl={logoUrl} />
    );

    // Convert the Node stream to a Web ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', (chunk) => controller.enqueue(chunk));
        pdfStream.on('end', () => controller.close());
        pdfStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Invoice-${docNo}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating Invoice PDF:', error);
    return new NextResponse('Internal Server Error generating PDF', { status: 500 });
  }
}
