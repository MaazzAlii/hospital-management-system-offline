import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clinicInfo: {
    flex: 1,
  },
  clinicName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#1a365d',
  },
  clinicDetails: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.4,
  },
  reportTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1a365d',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  reportInfo: {
    marginTop: 10,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 3,
  },
  infoLabel: {
    color: '#666',
    marginRight: 10,
    width: 60,
    textAlign: 'right',
  },
  infoValue: {
    fontFamily: 'Helvetica-Bold',
    width: 100,
    textAlign: 'right',
  },
  patientBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 20,
    backgroundColor: '#f8fafc',
  },
  patientCol: {
    flex: 1,
  },
  patientLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  patientValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#0f172a',
    marginBottom: 6,
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a365d',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  cellTestName: { flex: 3 },
  cellResult: { flex: 1.5 },
  cellUnit: { flex: 1 },
  cellRange: { flex: 2 },
  cellFlag: { flex: 1, textAlign: 'center' },
  flagHigh: { color: '#dc2626', fontFamily: 'Helvetica-Bold' },
  flagLow: { color: '#ea580c', fontFamily: 'Helvetica-Bold' },
  flagNormal: { color: '#16a34a' },
  verificationSection: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBox: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 10,
    alignItems: 'center',
  },
  signatureText: {
    fontSize: 9,
    color: '#475569',
    marginBottom: 2,
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#0f172a',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
});

export function LabReportPDF({ order, settings, logoUrl }: { order: any, settings: any, logoUrl?: string }) {
  // Filter for verified results only
  const verifiedResults = (order.results || []).filter((r: any) => r.status === 'verified');
  
  // Create a map to easily display test info along with result
  const itemMap = new Map();
  (order.items || []).forEach((item: any) => {
    itemMap.set(item.id, item);
  });

  // Find the latest verification timestamp
  let latestVerificationDate = '';
  verifiedResults.forEach((r: any) => {
    if (r.verifiedAt) {
      if (!latestVerificationDate || new Date(r.verifiedAt) > new Date(latestVerificationDate)) {
        latestVerificationDate = r.verifiedAt;
      }
    }
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {logoUrl && (
              <Image 
                src={logoUrl} 
                style={{ width: 70, height: 70, marginRight: 15, objectFit: 'contain' }} 
              />
            )}
            <View>
              <Text style={styles.clinicName}>LIFE CARE HOSPITAL</Text>
              <Text style={styles.clinicDetails}>{settings?.address || 'Address'}</Text>
              <Text style={styles.clinicDetails}>Phone: {settings?.phone || 'Phone'}</Text>
              <Text style={styles.clinicDetails}>Email: {settings?.email || 'Email'}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.reportTitle}>LAB REPORT</Text>
            <View style={styles.reportInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order No:</Text>
                <Text style={styles.infoValue}>{order.orderNo}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(order.orderedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Patient Details */}
        <View style={styles.patientBox}>
          <View style={styles.patientCol}>
            <Text style={styles.patientLabel}>Patient Name</Text>
            <Text style={styles.patientValue}>{order.Patient?.name}</Text>
            
            <Text style={styles.patientLabel}>MRN</Text>
            <Text style={styles.patientValue}>{order.Patient?.mrn}</Text>
          </View>
          <View style={styles.patientCol}>
            <Text style={styles.patientLabel}>Gender / Age</Text>
            <Text style={styles.patientValue}>
              {order.Patient?.gender || 'N/A'} {order.Patient?.dob ? `/ ${new Date().getFullYear() - new Date(order.Patient.dob).getFullYear()} yrs` : ''}
            </Text>
            
            <Text style={styles.patientLabel}>Referred By</Text>
            <Text style={styles.patientValue}>
              {order.Doctor?.user?.name || 'Self'}
            </Text>
          </View>
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
            const testName = item?.LabTest?.name || 'Unknown Test';
            const flag = result.flag || 'Normal';
            
            let flagStyle = styles.flagNormal;
            if (flag.toLowerCase() === 'high') flagStyle = styles.flagHigh;
            if (flag.toLowerCase() === 'low') flagStyle = styles.flagLow;

            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cellTestName}>{testName}</Text>
                <Text style={[styles.cellResult, { fontFamily: 'Helvetica-Bold' }]}>{result.resultValue}</Text>
                <Text style={styles.cellUnit}>{result.unit || '-'}</Text>
                <Text style={styles.cellRange}>{result.referenceRange || '-'}</Text>
                <Text style={[styles.cellFlag, flagStyle]}>{flag}</Text>
              </View>
            );
          })}
          
          {verifiedResults.length === 0 && (
            <View style={{ padding: 20, textAlign: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 10 }}>No verified results available yet.</Text>
            </View>
          )}
        </View>

        {/* Verification Signature */}
        {verifiedResults.length > 0 && (
          <View style={styles.verificationSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureText}>Verified By</Text>
              <Text style={styles.signatureName}>
                {verifiedResults[0]?.verifierName || 'Lab Technician'}
              </Text>
              {verifiedResults[0]?.verifierRole && (
                <Text style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>
                  {verifiedResults[0]?.verifierRole}
                </Text>
              )}
              {latestVerificationDate && (
                <Text style={{ fontSize: 8, color: '#64748b', marginTop: 4 }}>
                  {new Date(latestVerificationDate).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          This is an electronically generated report. Please consult your physician for medical advice.
        </Text>
      </Page>
    </Document>
  );
}
