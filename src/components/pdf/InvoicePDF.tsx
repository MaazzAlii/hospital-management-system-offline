import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1e293b',
  },
  headerContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInfo: {
    flex: 1,
    paddingRight: 10,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  companyTagline: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 7.5,
    color: '#475569',
    lineHeight: 1.3,
  },
  invoiceMetaBox: {
    width: 200,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  invoiceTitle: {
    fontSize: 13,
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
  twoColSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 2,
    fontSize: 7.5,
  },
  cardLabel: {
    width: 75,
    color: '#64748b',
  },
  cardValue: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  table: {
    width: '100%',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    paddingVertical: 5,
    paddingHorizontal: 4,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    fontSize: 7.5,
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  colCode: { width: '6%', textAlign: 'center' },
  colDesc: { width: '28%', paddingRight: 4 },
  colBatch: { width: '12%', textAlign: 'left' },
  colExp: { width: '11%', textAlign: 'center' },
  colQty: { width: '6%', textAlign: 'right' },
  colFree: { width: '5%', textAlign: 'right' },
  colPrice: { width: '9%', textAlign: 'right' },
  colGross: { width: '10%', textAlign: 'right' },
  colDisc: { width: '6%', textAlign: 'right' },
  colNet: { width: '7%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },

  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },
  warrantyBox: {
    flex: 1.4,
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  warrantyTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginBottom: 2,
  },
  warrantyText: {
    fontSize: 6.5,
    color: '#64748b',
    lineHeight: 1.3,
  },
  totalsBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#ffffff',
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2.5,
    fontSize: 7.5,
  },
  totalLineBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    paddingTop: 4,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 15,
  },
  signatureBox: {
    width: 140,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    textAlign: 'center',
    paddingTop: 3,
    fontSize: 7.5,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 7,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
  },
});

export function InvoicePDF({
  invoice,
  settings,
  logoUrl,
}: {
  invoice: any;
  settings: any;
  logoUrl?: string;
}) {
  const currency = settings?.currency || 'PKR';
  const formatCur = (val: number) => `Rs ${Number(val || 0).toFixed(2)}`;

  // Normalizing invoice / sale data
  const invoiceNo = invoice.saleNo || invoice.invoiceNo || 'INV-000';
  const invoiceDate = invoice.saleDate || invoice.createdAt || new Date();
  const customerName =
    invoice.patient?.name ||
    invoice.customerName ||
    (invoice.patient?.firstName ? `${invoice.patient.firstName} ${invoice.patient.lastName || ''}`.trim() : null) ||
    'Walk-in / Cash Customer';

  const items = invoice.items || [];
  const totalBilledQty = items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
  const totalFreeQty = items.reduce((s: number, i: any) => s + (Number(i.freeQty) || 0), 0);
  const totalGross = items.reduce(
    (s: number, i: any) =>
      s +
      Number(
        i.grossAmount ??
          ((i.tradePrice || i.unitPrice || 0) * (i.quantity || 0))
      ),
    0
  );
  const totalDiscount = items.reduce(
    (s: number, i: any) => s + (Number(i.discountAmount) || 0),
    0
  );
  const totalTax = items.reduce(
    (s: number, i: any) => s + ((Number(i.sTax) || 0) + (Number(i.gst) || 0)),
    0
  );
  const grandTotal = Number(invoice.totalAmount ?? invoice.total ?? (totalGross - totalDiscount + totalTax));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {logoUrl && (
                <Image
                  src={logoUrl}
                  style={{ width: 50, height: 50, marginRight: 10, objectFit: 'contain' }}
                />
              )}
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>
                  {invoice.suppliedBy || settings?.clinicName || 'LIFE CARE PHARMACY & DISTRIBUTORS'}
                </Text>
                <Text style={styles.companyTagline}>Wholesale Medicine Distributors & Health Care Solutions</Text>
                <Text style={styles.companyDetails}>
                  {settings?.address || 'Main Road, Health Plaza, Sector G-9, Islamabad'} | Phone:{' '}
                  {settings?.phone || '051-1234567'} | Email: {settings?.email || 'info@lifecare.com'}
                </Text>
              </View>
            </View>

            <View style={styles.invoiceMetaBox}>
              <Text style={styles.invoiceTitle}>SALES INVOICE</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice No:</Text>
                <Text style={styles.metaValue}>{invoiceNo}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice Date:</Text>
                <Text style={styles.metaValue}>{new Date(invoiceDate).toLocaleDateString()}</Text>
              </View>
              {invoice.summaryPrsNo && (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>PRS / Summary #:</Text>
                  <Text style={styles.metaValue}>{invoice.summaryPrsNo}</Text>
                </View>
              )}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Status:</Text>
                <Text style={[styles.metaValue, { color: '#166534' }]}>
                  {(invoice.status || 'COMPLETED').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2-Column Buyer & Order Info */}
        <View style={styles.twoColSection}>
          {/* Buyer Details */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Customer / Consignee Details</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Customer Name:</Text>
              <Text style={styles.cardValue}>{customerName}</Text>
            </View>
            {invoice.accountCode && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Account Code:</Text>
                <Text style={styles.cardValue}>{invoice.accountCode}</Text>
              </View>
            )}
            {(invoice.customerPhone || invoice.patient?.phone) && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Contact No:</Text>
                <Text style={styles.cardValue}>{invoice.customerPhone || invoice.patient?.phone}</Text>
              </View>
            )}
            {(invoice.customerAddress || invoice.patient?.address) && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Address:</Text>
                <Text style={styles.cardValue}>{invoice.customerAddress || invoice.patient?.address}</Text>
              </View>
            )}
            {invoice.licenseNo && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Drug License #:</Text>
                <Text style={styles.cardValue}>{invoice.licenseNo}</Text>
              </View>
            )}
            {invoice.ntn && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>NTN #:</Text>
                <Text style={styles.cardValue}>{invoice.ntn}</Text>
              </View>
            )}
          </View>

          {/* Logistics / Booker Details */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Order Booking & Logistics</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Supplied By:</Text>
              <Text style={styles.cardValue}>{invoice.suppliedBy || settings?.clinicName || 'Life Care Pharmacy'}</Text>
            </View>
            {invoice.bookedBy && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Booked By:</Text>
                <Text style={styles.cardValue}>{invoice.bookedBy}</Text>
              </View>
            )}
            {invoice.salesmanMobile && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Salesman Mobile:</Text>
                <Text style={styles.cardValue}>{invoice.salesmanMobile}</Text>
              </View>
            )}
            {invoice.territory && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Territory / Area:</Text>
                <Text style={styles.cardValue}>{invoice.territory}</Text>
              </View>
            )}
            {invoice.patient?.mrn && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>MRN Reference:</Text>
                <Text style={styles.cardValue}>{invoice.patient.mrn}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCode}>S#</Text>
            <Text style={styles.colDesc}>Product Name / Description</Text>
            <Text style={styles.colBatch}>Batch No</Text>
            <Text style={styles.colExp}>Expiry</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colFree}>Free</Text>
            <Text style={styles.colPrice}>T.Price</Text>
            <Text style={styles.colGross}>Gross (Rs)</Text>
            <Text style={styles.colDisc}>Disc</Text>
            <Text style={styles.colNet}>Net (Rs)</Text>
          </View>

          {items.map((item: any, idx: number) => {
            const price = Number(item.tradePrice ?? item.unitPrice ?? 0);
            const qty = Number(item.quantity) || 0;
            const gross = Number(item.grossAmount ?? (price * qty));
            const disc = Number(item.discountAmount || 0);
            const tax = Number((item.sTax || 0) + (item.gst || 0));
            const net = Number(item.netAmount ?? item.totalPrice ?? item.total ?? (gross - disc + tax));
            const medName = item.medicine?.name || item.description || 'Medicine';
            const batchNo = item.batchNo || item.batch?.batchNo || '—';
            const expStr = item.expiryDate
              ? new Date(item.expiryDate).toLocaleDateString()
              : item.batch?.expiryDate
              ? new Date(item.batch.expiryDate).toLocaleDateString()
              : '—';

            return (
              <View key={idx} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}>
                <Text style={styles.colCode}>{idx + 1}</Text>
                <Text style={styles.colDesc}>{medName}</Text>
                <Text style={styles.colBatch}>{batchNo}</Text>
                <Text style={styles.colExp}>{expStr}</Text>
                <Text style={styles.colQty}>{qty}</Text>
                <Text style={styles.colFree}>{item.freeQty || 0}</Text>
                <Text style={styles.colPrice}>{price.toFixed(2)}</Text>
                <Text style={styles.colGross}>{gross.toFixed(2)}</Text>
                <Text style={styles.colDisc}>{disc > 0 ? disc.toFixed(1) : '-'}</Text>
                <Text style={styles.colNet}>{net.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary & Warranty Footer */}
        <View style={styles.summarySection}>
          {/* Warranty Block */}
          <View style={styles.warrantyBox}>
            <Text style={styles.warrantyTitle}>WARRANTY & TERMS OF SALE:</Text>
            <Text style={styles.warrantyText}>
              Warranty under Section 23(1)(i) of Drugs Act 1976: We hereby give warranty that the drugs specified in
              this invoice do not contravene any provisions of Section 23 of the Drugs Act 1976.
              {'\n'}• Goods once sold are not returnable or exchangeable without original warranty invoice.
              {'\n'}• Store in a cool & dry place below 25°C. Keep out of reach of children.
            </Text>
          </View>

          {/* Totals Calculation Box */}
          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={{ color: '#64748b' }}>Total Billed Items:</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                {items.length} (Qty: {totalBilledQty} + Free: {totalFreeQty})
              </Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={{ color: '#64748b' }}>Gross Amount:</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCur(totalGross)}</Text>
            </View>
            {totalDiscount > 0 && (
              <View style={styles.totalLine}>
                <Text style={{ color: '#64748b' }}>Total Discount:</Text>
                <Text style={{ color: '#dc2626' }}>-{formatCur(totalDiscount)}</Text>
              </View>
            )}
            {totalTax > 0 && (
              <View style={styles.totalLine}>
                <Text style={{ color: '#64748b' }}>Total S.Tax / GST:</Text>
                <Text>{formatCur(totalTax)}</Text>
              </View>
            )}
            <View style={styles.totalLineBold}>
              <Text>Net Invoice Total:</Text>
              <Text>{formatCur(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Signature Lines */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text>Prepared / Checked By</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Order Booker / Salesman</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Customer / Receiver's Signature</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business. Computer generated invoice — No physical signature required for valid electronic copy.
        </Text>
      </Page>
    </Document>
  );
}
