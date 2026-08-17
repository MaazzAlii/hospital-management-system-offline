import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clinicInfo: {
    flex: 1,
    paddingRight: 10,
  },
  clinicName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  clinicTagline: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 3,
  },
  clinicDetails: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.3,
  },
  reportMetaBox: {
    width: 190,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  reportTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    fontSize: 8,
  },
  metaLabel: {
    color: '#64748b',
    fontFamily: 'Helvetica',
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  patientBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  patientCol: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 7.5,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  patientValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#0f172a',
    marginBottom: 4,
  },
  table: {
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  cellTestName: { flex: 3 },
  cellResult: { flex: 1.5 },
  cellUnit: { flex: 1 },
  cellRange: { flex: 2 },
  cellFlag: { flex: 1, textAlign: 'center' },
  flagHigh: { color: '#dc2626', fontFamily: 'Helvetica-Bold' },
  flagLow: { color: '#ea580c', fontFamily: 'Helvetica-Bold' },
  flagNormal: { color: '#16a34a' },
  billingSection: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    padding: 8,
  },
  billingTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 3,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
    fontSize: 8,
  },
  billingTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
    marginTop: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  verificationSection: {
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBox: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 6,
    alignItems: 'center',
  },
  signatureText: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 2,
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#0f172a',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 35,
    right: 35,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 7,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
});

export function LabReportPDF({
  order,
  invoice,
  settings,
  logoUrl,
}: {
  order: any;
  invoice?: any;
  settings: any;
  logoUrl?: string;
}) {
  const verifiedResults = (order.results || []).filter((r: any) => r.status === 'verified');
  const patient = order.patient || order.Patient;
  const doctor = order.doctor || order.Doctor;

  const itemMap = new Map();
  (order.items || []).forEach((item: any) => {
    itemMap.set(item.id, item);
  });

  let latestVerificationDate = '';
  verifiedResults.forEach((r: any) => {
    if (r.verifiedAt) {
      if (!latestVerificationDate || new Date(r.verifiedAt) > new Date(latestVerificationDate)) {
        latestVerificationDate = r.verifiedAt;
      }
    }
  });

  // Calculate billing amounts
  const items = order.items || [];
  const calculatedSubtotal = items.reduce(
    (sum: number, it: any) => sum + Number(it.price || it.test?.price || 0),
    0
  );
  const totalAmount = Number(invoice?.total ?? order.totalAmount ?? calculatedSubtotal);
  const paidAmount = Number(
    invoice?.paidAmt ?? (invoice?.status === 'paid' ? totalAmount : 0)
  );
  const dueAmount = Number(
    invoice?.dueAmt ?? (invoice?.status === 'paid' ? 0 : Math.max(0, totalAmount - paidAmount))
  );
  const paymentStatus = (invoice?.status || (paidAmount >= totalAmount && totalAmount > 0 ? 'paid' : 'unpaid')).toUpperCase();

  const formatRs = (val: number) => `Rs ${Number(val || 0).toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {logoUrl && (
              <Image
                src={logoUrl}
                style={{ width: 45, height: 45, marginRight: 10, objectFit: 'contain' }}
              />
            )}
            <View style={styles.clinicInfo}>
              <Text style={styles.clinicName}>
                {settings?.clinicName || 'Life Care Clinic, Nawagai Buner'}
              </Text>
              <Text style={styles.clinicTagline}>Clinical Diagnostic Laboratory Services</Text>
              <Text style={styles.clinicDetails}>
                {settings?.address || 'Nawagai, Buner, Khyber Pakhtunkhwa'}
              </Text>
              <Text style={styles.clinicDetails}>
                Phone: {settings?.phone || '03439626941'}  |  Email: {settings?.email || 'shakeelbuneri933@gmail.com'}
              </Text>
            </View>
          </View>

          <View style={styles.reportMetaBox}>
            <Text style={styles.reportTitle}>LAB REPORT & BILL</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Order No:</Text>
              <Text style={styles.metaValue}>{order.orderNo}</Text>
            </View>
            {invoice?.invoiceNo && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice No:</Text>
                <Text style={styles.metaValue}>{invoice.invoiceNo}</Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{new Date(order.orderedAt || order.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Status:</Text>
              <Text
                style={[
                  styles.metaValue,
                  {
                    color:
                      paymentStatus === 'PAID'
                        ? '#166534'
                        : paymentStatus === 'PARTIAL'
                        ? '#b45309'
                        : '#b91c1c',
                  },
                ]}
              >
                {paymentStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Patient Details */}
        <View style={styles.patientBox}>
          <View style={styles.patientCol}>
            <Text style={styles.patientLabel}>Patient Name</Text>
            <Text style={styles.patientValue}>
              {patient?.name || (patient?.firstName ? `${patient.firstName} ${patient.lastName || ''}`.trim() : 'N/A')}
            </Text>

            <Text style={styles.patientLabel}>MRN</Text>
            <Text style={styles.patientValue}>{patient?.mrn || 'N/A'}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.patientLabel}>Gender / Age</Text>
            <Text style={styles.patientValue}>
              {patient?.gender || 'N/A'}{' '}
              {patient?.dob
                ? `/ ${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs`
                : ''}
            </Text>

            <Text style={styles.patientLabel}>Referred By</Text>
            <Text style={styles.patientValue}>
              {doctor?.user?.name || doctor?.name || 'Self'}
            </Text>
          </View>
          {patient?.phone && (
            <View style={styles.patientCol}>
              <Text style={styles.patientLabel}>Contact No</Text>
              <Text style={styles.patientValue}>{patient.phone}</Text>
              {patient?.address && (
                <>
                  <Text style={styles.patientLabel}>Address</Text>
                  <Text style={styles.patientValue}>{patient.address}</Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Test Results Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellTestName]}>Test Name</Text>
            <Text style={[styles.tableHeaderCell, styles.cellResult]}>Result</Text>
            <Text style={[styles.tableHeaderCell, styles.cellUnit]}>Unit</Text>
            <Text style={[styles.tableHeaderCell, styles.cellRange]}>Ref. Range</Text>
            <Text style={[styles.tableHeaderCell, styles.cellFlag]}>Flag</Text>
          </View>

          {verifiedResults.map((result: any, i: number) => {
            const item = itemMap.get(result.labOrderItemId);
            const testName = item?.test?.name || item?.LabTest?.name || result.test?.name || 'Diagnostic Test';
            const flag = result.flag || 'Normal';

            let flagStyle = styles.flagNormal;
            if (flag.toLowerCase() === 'high') flagStyle = styles.flagHigh;
            if (flag.toLowerCase() === 'low') flagStyle = styles.flagLow;

            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellTestName}>{testName}</Text>
                <Text style={[styles.cellResult, { fontFamily: 'Helvetica-Bold' }]}>
                  {result.resultValue}
                </Text>
                <Text style={styles.cellUnit}>{result.unit || '-'}</Text>
                <Text style={styles.cellRange}>{result.referenceRange || '-'}</Text>
                <Text style={[styles.cellFlag, flagStyle]}>{flag}</Text>
              </View>
            );
          })}

          {verifiedResults.length === 0 && (
            <View style={{ padding: 12, textAlign: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 8.5 }}>
                No verified lab results recorded yet. (Pending lab test verification)
              </Text>
            </View>
          )}
        </View>

        {/* Lab Billing & Payment Summary Section */}
        <View style={styles.billingSection}>
          <Text style={styles.billingTitle}>Billing & Payment Details</Text>
          <View style={{ marginBottom: 4 }}>
            {items.map((it: any, idx: number) => {
              const testName = it.test?.name || it.LabTest?.name || `Lab Test #${idx + 1}`;
              const testPrice = Number(it.price || it.test?.price || 0);
              return (
                <View key={idx} style={styles.billingRow}>
                  <Text style={{ color: '#475569', flex: 1 }}>{idx + 1}. {testName}</Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', color: '#0f172a' }}>
                    {formatRs(testPrice)}
                  </Text>
                </View>
              );
            })}
          </View>

          {invoice?.discountAmt > 0 && (
            <View style={styles.billingRow}>
              <Text style={{ color: '#64748b' }}>Discount:</Text>
              <Text style={{ color: '#16a34a', fontFamily: 'Helvetica-Bold' }}>
                - {formatRs(invoice.discountAmt)}
              </Text>
            </View>
          )}

          <View style={styles.billingTotalRow}>
            <Text style={{ color: '#0f172a' }}>Total Amount:</Text>
            <Text style={{ color: '#0f172a' }}>{formatRs(totalAmount)}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={{ color: '#64748b' }}>Amount Paid:</Text>
            <Text style={{ color: '#166534', fontFamily: 'Helvetica-Bold' }}>
              {formatRs(paidAmount)}
            </Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={{ color: '#64748b' }}>Balance Due:</Text>
            <Text
              style={{
                color: dueAmount > 0 ? '#dc2626' : '#166534',
                fontFamily: 'Helvetica-Bold',
              }}
            >
              {formatRs(dueAmount)}
            </Text>
          </View>
        </View>

        {/* Verification Signature */}
        {verifiedResults.length > 0 && (
          <View style={styles.verificationSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>Verified By</Text>
              <Text style={styles.signatureName}>
                {verifiedResults[0]?.verifierName || 'Lab Pathologist / Technician'}
              </Text>
              {verifiedResults[0]?.verifierRole && (
                <Text style={{ fontSize: 7.5, color: '#64748b', marginTop: 1 }}>
                  {verifiedResults[0]?.verifierRole}
                </Text>
              )}
              {latestVerificationDate && (
                <Text style={{ fontSize: 7.5, color: '#64748b', marginTop: 2 }}>
                  {new Date(latestVerificationDate).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          This is an electronically generated laboratory diagnostic report and official billing receipt from {settings?.clinicName || 'Life Care Clinic'}.
        </Text>
      </Page>
    </Document>
  );
}

