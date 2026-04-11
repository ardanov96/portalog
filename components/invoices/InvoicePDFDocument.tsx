// Komponen ini hanya dipakai di server (renderToBuffer) — tidak di-render di browser
import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceData {
  invoiceNo:    string
  invoiceDate:  string
  dueDate?:     string | null
  referenceNo:  string
  isPaid:       boolean
  shipmentType: string
  shipmentMode: string
  originPort:   string
  destPort:     string
  etd:          string
  eta:          string
  vesselName:   string
  voyageNo:     string
  notes?:       string | null

  clientName:    string
  clientPic?:    string | null
  clientAddress?: string | null
  clientCity?:    string | null
  clientNpwp?:    string | null
  clientEmail?:   string | null
  clientPhone?:   string | null

  orgName:    string
  orgAddress?: string | null
  orgCity?:    string | null
  orgPhone?:   string | null
  orgEmail?:   string | null
  orgNpwp?:    string | null

  items:       { label: string; amount: number }[]
  subtotal:    number
  discount?:   number | null
  taxPercent?: number | null
  taxAmount?:  number | null
  total:       number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style:    'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

const modeLabel: Record<string, string> = {
  SEA_FCL: 'Sea FCL', SEA_LCL: 'Sea LCL', AIR: 'Air Cargo', LAND: 'Land',
}
const typeLabel: Record<string, string> = {
  IMPORT: 'Import', EXPORT: 'Export',
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  primary:   '#1a56db',
  dark:      '#111827',
  text:      '#374151',
  muted:     '#6b7280',
  light:     '#f9fafb',
  border:    '#e5e7eb',
  green:     '#059669',
  greenBg:   '#ecfdf5',
  paid:      '#065f46',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    backgroundColor: '#ffffff',
    paddingTop: 40,
    paddingBottom: 50,
    paddingHorizontal: 45,
  },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  headerLeft: { flex: 1 },
  orgName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 3 },
  orgSub: { fontSize: 8, color: C.muted, lineHeight: 1.5 },
  headerRight: { alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: C.primary, marginBottom: 4 },
  invoiceNo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 2 },
  invoiceMeta: { fontSize: 8, color: C.muted, lineHeight: 1.6 },

  // Paid stamp
  paidBadge: { backgroundColor: C.greenBg, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6, borderWidth: 1.5, borderColor: C.green },
  paidText: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.paid, textAlign: 'center' },

  // Divider
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  dividerStrong: { height: 2, backgroundColor: C.primary, marginVertical: 14 },

  // Parties
  partiesRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  partyBox: { flex: 1, backgroundColor: C.light, borderRadius: 6, padding: 12 },
  partyLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 2 },
  partyLine: { fontSize: 8, color: C.muted, lineHeight: 1.5 },

  // Shipment info
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, marginBottom: 18, borderWidth: 1, borderColor: C.border, borderRadius: 6, overflow: 'hidden' },
  infoCell: { width: '33.33%', padding: 9, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  infoCellLast: { borderRightWidth: 0 },
  infoLabel: { fontSize: 7, color: C.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },

  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: C.primary, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 4, marginBottom: 1 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: C.border },
  tableRowAlt: { backgroundColor: C.light },
  col1: { flex: 1 },
  col2: { width: 130, textAlign: 'right' },

  // Totals
  totalsBox: { marginTop: 4, alignSelf: 'flex-end', width: 240 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderColor: C.border },
  totalLabel: { fontSize: 9, color: C.muted },
  totalValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 2, backgroundColor: C.primary, borderRadius: 4, paddingHorizontal: 10 },
  grandLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  grandValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  // Notes
  notesBox: { marginTop: 20, backgroundColor: C.light, borderRadius: 6, padding: 12, borderLeftWidth: 3, borderColor: C.primary },
  notesLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  notesText: { fontSize: 8, color: C.text, lineHeight: 1.6 },

  // Footer
  footer: { position: 'absolute', bottom: 30, left: 45, right: 45 },
  footerLine: { height: 1, backgroundColor: C.border, marginBottom: 8 },
  footerText: { fontSize: 7, color: C.muted, textAlign: 'center', lineHeight: 1.5 },

  // Payment info
  paymentBox: { marginTop: 16, borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 12, flexDirection: 'row', gap: 20 },
  paymentLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  paymentValue: { fontSize: 9, color: C.dark, lineHeight: 1.5 },
})

// ─── Component ────────────────────────────────────────────────────────────────

export function InvoicePDFDocument({ data }: { data: InvoiceData }) {
  return (
    <Document
      title={`Invoice ${data.invoiceNo}`}
      author={data.orgName}
      subject={`Invoice for ${data.referenceNo}`}
    >
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.orgName}>{data.orgName}</Text>
            <Text style={s.orgSub}>
              {[data.orgAddress, data.orgCity].filter(Boolean).join(', ')}
              {data.orgNpwp ? `\nNPWP: ${data.orgNpwp}` : ''}
              {data.orgPhone ? `\nTelp: ${data.orgPhone}` : ''}
              {data.orgEmail ? `\n${data.orgEmail}` : ''}
            </Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceNo}>{data.invoiceNo}</Text>
            <Text style={s.invoiceMeta}>
              Tanggal: {data.invoiceDate}
              {data.dueDate ? `\nJatuh Tempo: ${data.dueDate}` : ''}
              {'\nReferensi: '}{data.referenceNo}
            </Text>
            {data.isPaid && (
              <View style={s.paidBadge}>
                <Text style={s.paidText}>✓ LUNAS</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.dividerStrong} />

        {/* ── Parties ── */}
        <View style={s.partiesRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Ditagihkan Kepada</Text>
            <Text style={s.partyName}>{data.clientName}</Text>
            {data.clientPic    && <Text style={s.partyLine}>Attn: {data.clientPic}</Text>}
            {data.clientAddress && <Text style={s.partyLine}>{data.clientAddress}</Text>}
            {data.clientCity   && <Text style={s.partyLine}>{data.clientCity}</Text>}
            {data.clientNpwp   && <Text style={s.partyLine}>NPWP: {data.clientNpwp}</Text>}
            {data.clientEmail  && <Text style={s.partyLine}>{data.clientEmail}</Text>}
            {data.clientPhone  && <Text style={s.partyLine}>Telp: {data.clientPhone}</Text>}
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Detail Pengiriman</Text>
            <Text style={s.partyName}>{typeLabel[data.shipmentType] ?? data.shipmentType} · {modeLabel[data.shipmentMode] ?? data.shipmentMode}</Text>
            <Text style={s.partyLine}>{data.originPort} → {data.destPort}</Text>
            {data.vesselName !== '-' && <Text style={s.partyLine}>Vessel: {data.vesselName} / {data.voyageNo}</Text>}
            {data.etd !== '-'        && <Text style={s.partyLine}>ETD: {data.etd}</Text>}
            {data.eta !== '-'        && <Text style={s.partyLine}>ETA: {data.eta}</Text>}
          </View>
        </View>

        {/* ── Line items table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, s.col1]}>Uraian Biaya</Text>
          <Text style={[s.tableHeaderText, s.col2]}>Jumlah</Text>
        </View>

        {data.items.map((item, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
            <Text style={[s.col1, { fontSize: 9, color: C.text }]}>{item.label}</Text>
            <Text style={[s.col2, { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.dark }]}>{idr(item.amount)}</Text>
          </View>
        ))}

        {data.items.length === 0 && (
          <View style={s.tableRow}>
            <Text style={[s.col1, { fontSize: 9, color: C.muted, fontStyle: 'italic' }]}>Tidak ada rincian biaya</Text>
          </View>
        )}

        {/* ── Totals ── */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{idr(data.subtotal)}</Text>
          </View>

          {data.discount ? (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Diskon</Text>
              <Text style={[s.totalValue, { color: C.green }]}>- {idr(data.discount)}</Text>
            </View>
          ) : null}

          {data.taxPercent ? (
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>PPN {data.taxPercent}%</Text>
              <Text style={s.totalValue}>{idr(data.taxAmount ?? 0)}</Text>
            </View>
          ) : null}

          <View style={s.grandTotalRow}>
            <Text style={s.grandLabel}>TOTAL</Text>
            <Text style={s.grandValue}>{idr(data.total)}</Text>
          </View>
        </View>

        {/* ── Payment info ── */}
        {!data.isPaid && (
          <View style={s.paymentBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentLabel}>Informasi Pembayaran</Text>
              <Text style={s.paymentValue}>Transfer ke rekening atas nama {data.orgName}</Text>
              <Text style={[s.paymentValue, { color: C.muted, fontSize: 8, marginTop: 2 }]}>
                Cantumkan nomor invoice {data.invoiceNo} sebagai referensi pembayaran
              </Text>
            </View>
            {data.dueDate && (
              <View>
                <Text style={s.paymentLabel}>Jatuh Tempo</Text>
                <Text style={[s.paymentValue, { color: '#dc2626', fontFamily: 'Helvetica-Bold' }]}>{data.dueDate}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Notes ── */}
        {data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesLabel}>Catatan</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <View style={s.footerLine} />
          <Text style={s.footerText}>
            {data.orgName}
            {data.orgAddress ? ` · ${data.orgAddress}` : ''}
            {data.orgCity ? `, ${data.orgCity}` : ''}
            {'\n'}
            Dokumen ini digenerate secara otomatis oleh ForwarderOS · {data.invoiceNo}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
