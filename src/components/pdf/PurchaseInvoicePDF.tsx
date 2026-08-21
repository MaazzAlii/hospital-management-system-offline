import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
    marginBottom: 10,
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
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  companyTagline: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 3,
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
    fontSize: 7.5,
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
    fontSize: 8,
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
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 7.5,
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  colNo: { width: '5%', textAlign: 'center' },
  colDesc: { width: '33%', paddingRight: 4 },
  colBatch: { width: '15%', textAlign: 'left' },
  colExp: { width: '13%', textAlign: 'center' },
  colQty: { width: '8%', textAlign: 'right' },
  colPrice: { width: '12%', textAlign: 'right' },
  colNet: { width: '14%', textAlign: 'right', fontFamily: 'Helvetica-Bold' },

  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  notesBox: {
    flex: 1.3,
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8fafc',
  },
  notesTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 7,
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
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 10,
  },
  signatureBox: {
    width: 130,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    textAlign: 'center',
    paddingTop: 3,
    fontSize: 7.5,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 28,
    right: 28,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 6.5,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 3,
  },
});

export function PurchaseInvoicePDF({
  purchase,
  settings,
  logoUrl,
}: {
  purchase: any;
  settings: any;
  logoUrl?: string;
}) {
  const currency = settings?.currency || 'PKR';
  const formatCur = (val: number) => `Rs ${Number(val || 0).toFixed(2)}`;

  const purchaseNo = purchase.purchaseNo || 'PUR-000';
  const purchaseDate = purchase.purchaseDate || purchase.createdAt || new Date();
  const formattedDate = new Date(purchaseDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const supplier = purchase.supplier || {};
  const items = purchase.items || [];

  let totalUnits = 0;
  let totalGross = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const itemTotal = Number(item.totalPrice) || qty * price;
    totalUnits += qty;
    totalGross += itemTotal;
  }

  const netPayable = Number(purchase.totalAmount) || totalGross;

  return (
    <Document title={`Purchase-Invoice-${purchaseNo}`}>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={styles.companyInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {logoUrl && (
                  <Image
                    src={logoUrl}
                    style={{ width: 42, height: 42, objectFit: 'contain' }}
                  />
                )}
                <View>
                  <Text style={styles.companyName}>
                    {settings?.clinicName || 'Life Care Clinic & Pharmacy'}
                  </Text>
                  <Text style={styles.companyTagline}>
                    Medical Healthcare & Retail / Wholesale Pharmacy
                  </Text>
                </View>
              </View>
              <Text style={styles.companyDetails}>
                Address: {settings?.address || 'Nawagai, Buner, Khyber Pakhtunkhwa'}
              </Text>
              <Text style={styles.companyDetails}>
                Phone: {settings?.phone || '0343-9626941'}
              </Text>
              <Text style={styles.companyDetails}>
                Email: {settings?.email || 'shakeelbuneri933@gmail.com'}
              </Text>
            </View>

            <View style={styles.invoiceMetaBox}>
              <Text style={styles.invoiceTitle}>PURCHASE INVOICE</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Purchase No:</Text>
                <Text style={styles.metaValue}>{purchaseNo}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Date:</Text>
                <Text style={styles.metaValue}>{formattedDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Status:</Text>
                <Text style={[styles.metaValue, { textTransform: 'capitalize' }]}>
                  {purchase.status || 'Completed'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* TWO COLUMN DETAILS: SUPPLIER & RECEIVING DESTINATION */}
        <View style={styles.twoColSection}>
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Supplier Details</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Supplier Name:</Text>
              <Text style={styles.cardValue}>{supplier.name || 'Unknown / Walk-in Supplier'}</Text>
            </View>
            {supplier.contactPerson && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Contact Person:</Text>
                <Text style={styles.cardValue}>{supplier.contactPerson}</Text>
              </View>
            )}
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Phone / Mobile:</Text>
              <Text style={styles.cardValue}>{supplier.phone || '—'}</Text>
            </View>
            {supplier.email && (
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Email:</Text>
                <Text style={styles.cardValue}>{supplier.email}</Text>
              </View>
            )}
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Address:</Text>
              <Text style={styles.cardValue}>{supplier.address || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Receiving Facility Details</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Received At:</Text>
              <Text style={styles.cardValue}>{settings?.clinicName || 'Life Care Clinic & Pharmacy'}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Destination:</Text>
              <Text style={styles.cardValue}>Main Pharmacy Stock</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Contact:</Text>
              <Text style={styles.cardValue}>{settings?.phone || '0343-9626941'}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Location:</Text>
              <Text style={styles.cardValue}>{settings?.address || 'Nawagai, Buner'}</Text>
            </View>
          </View>
        </View>

        {/* LINE ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>S#</Text>
            <Text style={styles.colDesc}>Product Description</Text>
            <Text style={styles.colBatch}>Batch No</Text>
            <Text style={styles.colExp}>Expiry Date</Text>
            <Text style={styles.colQty}>Units (Qty)</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colNet}>Total Amount</Text>
          </View>

          {items.map((item: any, idx: number) => {
            const expFormatted = item.expiryDate
              ? new Date(item.expiryDate).toLocaleDateString('en-GB', {
                  month: 'short',
                  year: 'numeric',
                })
              : '—';
            const price = Number(item.unitPrice) || 0;
            const rowTotal = Number(item.totalPrice) || (Number(item.quantity) || 0) * price;

            return (
              <View
                key={item.id || idx}
                style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowEven : {}]}
              >
                <Text style={styles.colNo}>{idx + 1}</Text>
                <Text style={styles.colDesc}>
                  {item.medicine?.name || item.medicineName || 'Medicine'}
                  {item.medicine?.genericName ? ` (${item.medicine.genericName})` : ''}
                </Text>
                <Text style={styles.colBatch}>{item.batchNo || '—'}</Text>
                <Text style={styles.colExp}>{expFormatted}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{formatCur(price)}</Text>
                <Text style={styles.colNet}>{formatCur(rowTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* SUMMARY SECTION */}
        <View style={styles.summarySection}>
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Purchase Notes & Receiving Terms</Text>
            <Text style={styles.notesText}>
              {purchase.notes ||
                'All goods verified for quantity, batch numbers, and expiry integrity upon intake. Recorded in pharmacy inventory management system.'}
            </Text>
          </View>

          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={styles.metaLabel}>Total Line Items:</Text>
              <Text style={styles.metaValue}>{items.length}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.metaLabel}>Total Units (Qty):</Text>
              <Text style={styles.metaValue}>{totalUnits}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.metaLabel}>Gross Amount:</Text>
              <Text style={styles.metaValue}>{formatCur(totalGross)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.metaLabel}>Discount / Tax:</Text>
              <Text style={styles.metaValue}>Rs 0.00</Text>
            </View>
            <View style={styles.totalLineBold}>
              <Text>Net Payable:</Text>
              <Text>{formatCur(netPayable)}</Text>
            </View>
          </View>
        </View>

        {/* SIGNATURE SECTION */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureBox}>Prepared By</Text>
          <Text style={styles.signatureBox}>Store In-charge</Text>
          <Text style={styles.signatureBox}>Authorized Signature</Text>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          This is a computer-generated Purchase Stock Invoice from {settings?.clinicName || 'Life Care HMS'}.
        </Text>
      </Page>
    </Document>
  );
}
