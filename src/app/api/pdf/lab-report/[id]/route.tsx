import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { LabReportPDF } from '@/components/pdf/LabReportPDF';
import { getLabOrderDetails } from '@/app/actions/lab-result';
import { getClinicSettings } from '@/app/actions/billing';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth-utils';
import { hasAccess } from '@/lib/permissions';
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
    const supabase = await createClient();

    const [order, settings] = await Promise.all([
      getLabOrderDetails(resolvedParams.id),
      getClinicSettings()
    ]);

    if (!order) {
      return new NextResponse('Lab Order not found', { status: 404 });
    }

    // Fetch Reference Ranges for all tests in the order to display them in the PDF
    const testIds = order.items?.map((item: any) => item.testId).filter(Boolean) || [];
    if (testIds.length > 0) {
      const { data: ranges } = await supabase
        .from('ReferenceRange')
        .select('*')
        .in('testId', testIds);

      if (ranges) {
        // Map ranges to results. Simply picking the first range or matching by gender if possible.
        // A robust system would match age and gender exactly.
        order.results = order.results?.map((result: any) => {
          const item = order.items.find((i: any) => i.id === result.labOrderItemId);
          if (item) {
            const testRanges = ranges.filter((r: any) => r.testId === item.testId);
            let matchedRange = testRanges.find((r: any) => 
              r.gender === order.Patient?.gender || r.gender === 'All'
            ) || testRanges[0];
            
            if (matchedRange) {
              result.referenceRange = `${matchedRange.lowValue ?? ''} - ${matchedRange.highValue ?? ''} ${matchedRange.unit || ''}`.trim();
            }
          }
          return result;
        });
      }
    }

    // Fetch Verifier details using Supabase to ensure we get User and Role properly
    const verifiedResults = (order.results || []).filter((r: any) => r.status === 'verified' && r.verifiedBy && r.verifiedBy !== 'system');
    const verifierIds = [...new Set(verifiedResults.map((r: any) => r.verifiedBy))].filter(Boolean) as string[];
    
    if (verifierIds.length > 0) {
      // 1. Fetch Users
      const { data: users, error: usersError } = await supabase
        .from('User')
        .select('id, name, roleId')
        .in('id', verifierIds);
        
      if (users && users.length > 0) {
        // 2. Fetch Roles
        const roleIds = [...new Set(users.map((u: any) => u.roleId))].filter(Boolean) as string[];
        const { data: roles, error: rolesError } = await supabase
          .from('Role')
          .select('id, name')
          .in('id', roleIds);
          
        const roleMap = new Map();
        if (roles) {
          roles.forEach((r: any) => roleMap.set(r.id, r.name));
        }

        order.results = order.results.map((result: any) => {
          if (result.status === 'verified' && result.verifiedBy) {
            const user = users.find((u: any) => u.id === result.verifiedBy);
            if (user) {
              result.verifierName = user.name;
              result.verifierRole = roleMap.get(user.roleId);
            }
          }
          return result;
        });
      }
    }

    const url = new URL(request.url);
    const logoUrl = `${url.protocol}//${url.host}/logo.jpeg`;

    const pdfStream = await renderToStream(
      <LabReportPDF order={order} settings={settings} logoUrl={logoUrl} />
    );

    const readableStream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', (chunk) => controller.enqueue(chunk));
        pdfStream.on('end', () => controller.close());
        pdfStream.on('error', (err) => controller.error(err));
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="LabReport-${order.orderNo}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating Lab Report PDF:', error);
    return new NextResponse('Internal Server Error generating PDF', { status: 500 });
  }
}
