import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    marginBottom: 30,
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
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#1a365d',
  },
  clinicDetails: {
    fontSize: 10,
    color: '#666',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#e2e8f0',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  invoiceInfo: {
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
    width: 80,
    textAlign: 'right',
  },
  infoValue: {
    fontFamily: 'Helvetica-Bold',
    width: 100,
    textAlign: 'right',
  },
  patientSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    color: '#1a365d',
    textTransform: 'uppercase',
  },
  table: {
    width: '100%',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 10,
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totalsSection: {
    width: '40%',
    alignSelf: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  totalLabel: {
    color: '#666',
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 5,
    borderTopWidth: 2,
    borderTopColor: '#1a365d',
  },
  grandTotalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#1a365d',
  },
  grandTotalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#1a365d',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  statusPaid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusUnpaid: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
});

export function InvoicePDF({ invoice, settings, logoUrl }: { invoice: any, settings: any, logoUrl?: string }) {
  const currency = settings?.currency || 'PKR';
  const formatCurrency = (amount: number) => `${currency} ${Number(amount).toFixed(2)}`;
  
  const isPaid = invoice.status === 'paid';

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
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Invoice No:</Text>
                <Text style={styles.infoValue}>{invoice.invoiceNo}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Patient Info & Status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
          <View>
            <Text style={styles.sectionTitle}>Billed To</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, marginBottom: 4 }}>
              {invoice.patient?.name}
            </Text>
            <Text style={{ color: '#666' }}>MRN: {invoice.patient?.mrn}</Text>
          </View>
          <View>
            <Text style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusUnpaid]}>
              {invoice.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {invoice.items?.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {Number(invoice.discountAmt) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount ({Number(invoice.aoDiscountPct)}%)
              </Text>
              <Text style={styles.totalValue}>-{formatCurrency(invoice.discountAmt)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for trusting LIFE CARE HOSPITAL with your healthcare needs.
        </Text>
      </Page>
    </Document>
  );
}
