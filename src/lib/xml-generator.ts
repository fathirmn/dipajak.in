import type { ExtractedInvoice, CompanyProfile } from "./schemas";
import { calculateDppNilaiLain } from "./constants";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatNpwp(npwp: string): string {
  const cleaned = npwp.replace(/\D/g, "");
  return cleaned.padStart(16, "0");
}

function formatIdtku(npwp: string, branchCode: string = "000000"): string {
  const formattedNpwp = formatNpwp(npwp);
  const cleanBranch = branchCode.replace(/\D/g, "").padStart(6, "0").slice(0, 6);
  return formattedNpwp + cleanBranch;
}

function generateInvoiceXml(
  seller: CompanyProfile,
  invoice: ExtractedInvoice,
  trxCode: string = "04"
): string {
  const sellerIdtku = formatIdtku(seller.npwp);
  const buyerNpwp = invoice.buyerNpwp ? formatNpwp(invoice.buyerNpwp) : "";
  const buyerIdtku = invoice.buyerNpwp ? formatIdtku(invoice.buyerNpwp) : "";
  const originalVatRate = invoice.originalVatRate || 11;
  const buyerDocumentType = (invoice.buyerDocumentType || "TIN").toUpperCase();
  const buyerCountry = invoice.buyerCountry || "IDN";
  const buyerDocumentNumber = invoice.buyerDocumentNumber || "-";
  const buyerTinValue = buyerNpwp || "0000000000000000";
  const buyerIdtkuValue = buyerIdtku || "0000000000000000000000";
  const vatRateForXml = originalVatRate === 11 ? 12 : originalVatRate;
  const trxCodeValue = invoice.trxCode || trxCode || "04";
  const addInfo = invoice.additionalInfo || "";
  const customDoc = invoice.supportingDocument || "";
  const customDocMonthYear = invoice.supportingDocumentPeriod || "";
  const facilityStamp = invoice.facilityStamp || "";

  const itemsXml = invoice.items
    .map((item) => {
      const dppNilaiLain = calculateDppNilaiLain(item.taxBase, originalVatRate);
      const ppn = Math.round(dppNilaiLain * (vatRateForXml / 100));

      return `
      <GoodService>
        <Opt>${escapeXml((item.opt || "A").toUpperCase())}</Opt>
        <Code>${escapeXml(item.code || "000000")}</Code>
        <Name>${escapeXml(item.name)}</Name>
        <Unit>${escapeXml(item.unitCode || "UM.0018")}</Unit>
        <Price>${item.unitPrice}</Price>
        <Qty>${item.quantity}</Qty>
        <TotalDiscount>${item.discount || 0}</TotalDiscount>
        <TaxBase>${item.taxBase}</TaxBase>
        <OtherTaxBase>${dppNilaiLain}</OtherTaxBase>
        <VATRate>${vatRateForXml}</VATRate>
        <VAT>${ppn}</VAT>
        <STLGRate>0</STLGRate>
        <STLG>0</STLG>
      </GoodService>`;
    })
    .join("");

  return `
    <TaxInvoice>
      <TaxInvoiceDate>${escapeXml(invoice.invoiceDate)}</TaxInvoiceDate>
      <TaxInvoiceOpt>Normal</TaxInvoiceOpt>
      <TrxCode>${escapeXml(trxCodeValue)}</TrxCode>
      <AddInfo>${escapeXml(addInfo)}</AddInfo>
      <CustomDoc>${escapeXml(customDoc)}</CustomDoc>
      <CustomDocMonthYear>${escapeXml(customDocMonthYear)}</CustomDocMonthYear>
      <RefDesc>${escapeXml(invoice.invoiceNumber)}</RefDesc>
      <FacilityStamp>${escapeXml(facilityStamp)}</FacilityStamp>
      <SellerIDTKU>${sellerIdtku}</SellerIDTKU>
      <BuyerTin>${buyerTinValue}</BuyerTin>
      <BuyerDocument>${buyerDocumentType}</BuyerDocument>
      <BuyerCountry>${buyerCountry}</BuyerCountry>
      <BuyerDocumentNumber>${buyerDocumentNumber}</BuyerDocumentNumber>
      <BuyerName>${escapeXml(invoice.buyerName)}</BuyerName>
      <BuyerAdress>${escapeXml(invoice.buyerAddress || "")}</BuyerAdress>
      <BuyerEmail>${escapeXml(invoice.buyerEmail || "")}</BuyerEmail>
      <BuyerIDTKU>${buyerIdtkuValue}</BuyerIDTKU>
      <ListOfGoodService>${itemsXml}
      </ListOfGoodService>
    </TaxInvoice>`;
}

export function generateFakturPKXml(data: {
  seller: CompanyProfile;
  invoice: ExtractedInvoice;
  trxCode?: string;
}): string {
  const { seller, invoice, trxCode = "04" } = data;
  const sellerNpwp = formatNpwp(seller.npwp);
  const invoiceXml = generateInvoiceXml(seller, invoice, trxCode);

  return `<?xml version="1.0" encoding="utf-8" ?>
<TaxInvoiceBulk xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="TaxInvoice.xsd">
  <TIN>${sellerNpwp}</TIN>
  <ListOfTaxInvoice>${invoiceXml}
  </ListOfTaxInvoice>
</TaxInvoiceBulk>`;
}

export function generateBulkFakturPKXml(data: {
  seller: CompanyProfile;
  invoices: ExtractedInvoice[];
  trxCode?: string;
}): string {
  const { seller, invoices, trxCode = "04" } = data;
  const sellerNpwp = formatNpwp(seller.npwp);
  
  const invoicesXml = invoices
    .map((invoice) => generateInvoiceXml(seller, invoice, trxCode))
    .join("");

  return `<?xml version="1.0" encoding="utf-8" ?>
<TaxInvoiceBulk xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="TaxInvoice.xsd">
  <TIN>${sellerNpwp}</TIN>
  <ListOfTaxInvoice>${invoicesXml}
  </ListOfTaxInvoice>
</TaxInvoiceBulk>`;
}

export function downloadXml(xml: string, filename: string) {
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
