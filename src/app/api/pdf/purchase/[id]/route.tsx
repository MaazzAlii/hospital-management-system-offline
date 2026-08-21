import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { PurchaseInvoicePDF } from '@/components/pdf/PurchaseInvoicePDF';
import { getPurchaseById } from '@/app/actions/purchase';
import { getClinicSettings } from '@/app/actions/billing';
import { getCurrentUserRole } from '@/lib/auth-utils';
import { hasAccess } from '@/lib/permissions';
import { getLogoBase64, logPdfError } from '@/lib/pdf-utils';
import React from 'react';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user, role } = await getCurrentUserRole();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!hasAccess(role, 'pharmacy', 'read')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const resolvedParams = await params;

    const [purchase, settings] = await Promise.all([
      getPurchaseById(resolvedParams.id),
      getClinicSettings(),
    ]);

    if (!purchase) {
      return new NextResponse('Purchase record not found', { status: 404 });
    }

    const docNo = purchase.purchaseNo || 'PUR';
    const logoBase64 = getLogoBase64();

    const pdfStream = await renderToStream(
      <PurchaseInvoicePDF purchase={purchase} settings={settings} logoUrl={logoBase64} />
    );

    const readableStream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', (chunk) => controller.enqueue(chunk));
        pdfStream.on('end', () => controller.close());
        pdfStream.on('error', (err) => {
          logPdfError(`Purchase Stream [${docNo}]`, err);
          controller.error(err);
        });
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PurchaseInvoice-${docNo}.pdf"`,
      },
    });
  } catch (error: any) {
    logPdfError('Purchase Route', error);
    return new NextResponse(`Internal Server Error generating Purchase PDF: ${error?.message || error}`, { status: 500 });
  }
}
