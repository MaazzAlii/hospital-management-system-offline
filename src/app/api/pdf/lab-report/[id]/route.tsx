import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { LabReportPDF } from '@/components/pdf/LabReportPDF';
import { getLabOrderDetails } from '@/app/actions/lab-result';
import { getClinicSettings } from '@/app/actions/billing';
import { prisma } from '@/lib/prisma';
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

    if (!hasAccess(role, 'lab', 'read')) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const resolvedParams = await params;

    const [order, settings] = await Promise.all([
      getLabOrderDetails(resolvedParams.id),
      getClinicSettings()
    ]);

    if (!order) {
      return new NextResponse('Lab Order not found', { status: 404 });
    }

    // Fetch linked invoice and payments for billing details in the PDF
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { sourceType: 'Lab', sourceId: order.id },
          { notes: { contains: order.orderNo } },
        ],
      },
      include: {
        items: true,
        payments: true,
      },
    });

    // Fetch Reference Ranges for all tests in the order to display them in the PDF
    const testIds = order.items?.map((item: any) => item.testId).filter(Boolean) || [];
    if (testIds.length > 0) {
      const ranges = await prisma.referenceRange.findMany({
        where: { testId: { in: testIds } },
      });

      if (ranges && ranges.length > 0) {
        order.results = order.results?.map((result: any) => {
          const item = order.items.find((i: any) => i.id === result.labOrderItemId);
          if (item) {
            const testRanges = ranges.filter((r: any) => r.testId === item.testId);
            let matchedRange = testRanges.find((r: any) => 
              r.gender === (order.patient?.gender || (order as any).Patient?.gender) || r.gender === 'All'
            ) || testRanges[0];
            
            if (matchedRange) {
              result.referenceRange = `${matchedRange.lowerLimit ?? ''} - ${matchedRange.upperLimit ?? ''} ${matchedRange.unit || ''}`.trim();
            }
          }
          return result;
        });
      }
    }

    const logoBase64 = getLogoBase64();

    const pdfStream = await renderToStream(
      <LabReportPDF order={order} invoice={invoice} settings={settings} logoUrl={logoBase64} />
    );

    const readableStream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', (chunk) => controller.enqueue(chunk));
        pdfStream.on('end', () => controller.close());
        pdfStream.on('error', (err) => {
          logPdfError(`Lab Report Stream [${order.orderNo}]`, err);
          controller.error(err);
        });
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="LabReport-${order.orderNo}.pdf"`,
      },
    });
  } catch (error: any) {
    logPdfError('Lab Report Route', error);
    return new NextResponse(`Internal Server Error generating Lab Report PDF: ${error?.message || error}`, { status: 500 });
  }
}

