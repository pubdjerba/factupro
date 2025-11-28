
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../types';

// --- Helper: Number to Words (French) ---
const UNITS = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf'];
const TEENS = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf'];
const TENS = ['', 'Dix', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingt', 'Quatre-vingt-dix'];

const convertUnder1000 = (n: number): string => {
  let s = '';
  let num = n;
  
  if (num >= 100) {
    const h = Math.floor(num / 100);
    s += (h === 1 ? 'Cent' : UNITS[h] + ' Cent');
    if (h > 1 && num % 100 === 0) s += 's';
    if (num % 100 !== 0) s += ' ';
    num %= 100;
  }

  if (num > 0) {
    if (num < 10) s += UNITS[num];
    else if (num < 20) s += TEENS[num - 10];
    else {
      let t = Math.floor(num / 10);
      let u = num % 10;
      
      // Handle 70-79 and 90-99
      if (t === 7 || t === 9) {
        t -= 1;
        u += 10;
      }

      s += TENS[t];

      if (num === 80) s += 's'; // Quatre-vingts
      
      // Connectors
      if (u === 1 || u === 11) {
         if (t < 8) s += ' et ';
         else s += '-';
      } else if (u > 0) {
        s += '-';
      }

      if (u > 0) {
        if (u < 10) s += UNITS[u];
        else s += TEENS[u - 10];
      }
    }
  }
  return s;
};

const numberToWords = (n: number): string => {
  if (n === 0) return 'Zéro';
  
  let s = '';
  
  // Billions
  if (n >= 1000000000) {
    const b = Math.floor(n / 1000000000);
    s += convertUnder1000(b) + ' Milliard';
    if (b > 1) s += 's';
    if (n % 1000000000 !== 0) s += ' ';
    n %= 1000000000;
  }
  
  // Millions
  if (n >= 1000000) {
    const m = Math.floor(n / 1000000);
    s += convertUnder1000(m) + ' Million';
    if (m > 1) s += 's';
    if (n % 1000000 !== 0) s += ' ';
    n %= 1000000;
  }
  
  // Thousands
  if (n >= 1000) {
    const t = Math.floor(n / 1000);
    if (t === 1) s += 'Mille';
    else s += convertUnder1000(t) + ' Mille';
    if (n % 1000 !== 0) s += ' ';
    n %= 1000;
  }
  
  if (n > 0) {
    s += convertUnder1000(n);
  }
  
  return s;
};

const convertAmountToText = (amount: number): string => {
  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 1000);
  
  let text = numberToWords(intPart) + " Dinars";
  if (decPart > 0) {
    text += " et " + numberToWords(decPart) + " Millimes";
  }
  return text;
};

// --- PDF Generation ---

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const company = invoice.companySnap;
  const client = invoice.clientSnap;
  
  // Default to 'facture' if undefined (backward compatibility)
  const docType = invoice.type || 'facture';
  const isDevis = docType === 'devis';
  // Default to true if undefined
  const applyTva = invoice.tvaApplicable !== false;

  // --- COIN GAUCHE : Entreprise ---
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(41, 128, 185); // Bleu professionnel
  doc.text(company.name.toUpperCase(), 14, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80); // Gris foncé
  doc.text(company.address, 14, 26);
  doc.text(`MF: ${company.mf}`, 14, 31);
  
  // Dynamic vertical positioning for optional fields
  let yPos = 36;
  if (company.phone) {
    doc.text(`Tél: ${company.phone}`, 14, yPos);
    yPos += 5;
  }
  if (company.email) {
    doc.text(company.email, 14, yPos);
  }

  // --- COIN DROIT : Titre Facture/Devis & Infos ---
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  
  if (isDevis) {
    doc.setTextColor(100, 116, 139); // Gris bleuté pour Devis
    doc.text("DEVIS", 196, 25, { align: "right" });
  } else {
    doc.setTextColor(200, 200, 200); // Gris clair pour Facture
    doc.text("FACTURE", 196, 25, { align: "right" });
  }

  doc.setFontSize(11);
  doc.setTextColor(0); // Noir
  doc.setFont("helvetica", "bold");
  doc.text(`N° ${invoice.number}`, 196, 35, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date : ${invoice.date}`, 196, 40, { align: "right" });
  
  // Echéance ou Validité
  if (invoice.dueDate) {
    const label = isDevis ? "Validité jusqu'au :" : "Échéance :";
    doc.text(`${label} ${invoice.dueDate}`, 196, 45, { align: "right" });
  }

  // Ligne de séparation décorative
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(14, 50, 196, 50);

  // --- SECTION CLIENT (Droite, sous la ligne) ---
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(isDevis ? "Devis pour :" : "Facturé à :", 120, 60);
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(client.name, 120, 66);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  doc.text(client.address, 120, 72);
  doc.text(`MF: ${client.mf}`, 120, 77);

  // -- Table Items --
  const headers = ["Désignation", "U", "Qté", "Prix Unit.", "Total HT"];
  
  const tableRows: any[] = [];
  let subtotal = 0;
  
  invoice.items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    subtotal += itemTotal;
    tableRows.push([
      item.description,
      item.unit || 'U',
      item.quantity,
      item.unitPrice.toFixed(3),
      itemTotal.toFixed(3)
    ]);
  });

  autoTable(doc, {
    head: [headers],
    body: tableRows,
    startY: 90,
    theme: 'plain',
    headStyles: { 
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
        halign: 'center'
    },
    styles: { 
        fontSize: 10,
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [230, 230, 230],
        cellPadding: 3
    },
    columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
    }
  });

  // -- Totals --
  // Abaissement du Total HT (plus d'espace après le tableau)
  const finalY = (doc as any).lastAutoTable.finalY + 19;
  const tvaAmount = applyTva ? subtotal * (invoice.tvaRate / 100) : 0;
  const totalFinal = subtotal + tvaAmount;

  // Ligne de séparation avant totaux
  doc.setDrawColor(200);
  doc.line(140, finalY - 6, 196, finalY - 6);

  doc.setFontSize(10);
  doc.setTextColor(0);
  
  const labelX = 160;
  const valueX = 196;
  const lineHeight = 6;

  if (applyTva) {
    // Affichage Classique avec TVA
    doc.text("Total HT :", labelX, finalY, { align: "right" });
    doc.text(`${subtotal.toFixed(3)} DT`, valueX, finalY, { align: "right" });

    doc.text(`TVA (${invoice.tvaRate}%) :`, labelX, finalY + lineHeight, { align: "right" });
    doc.text(`${tvaAmount.toFixed(3)} DT`, valueX, finalY + lineHeight, { align: "right" });

    // Box Total TTC
    doc.setFillColor(245, 247, 250);
    doc.rect(130, finalY + lineHeight * 1.5, 66, 10, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("Total TTC :", labelX, finalY + lineHeight * 2.5, { align: "right" });
    doc.text(`${totalFinal.toFixed(3)} DT`, valueX, finalY + lineHeight * 2.5, { align: "right" });

  } else {
    // Affichage Sans TVA
    // Box Net à Payer directement
    doc.setFillColor(245, 247, 250);
    doc.rect(130, finalY - 4, 66, 10, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 128, 185);
    doc.text("Net à Payer :", labelX, finalY + 3, { align: "right" });
    doc.text(`${totalFinal.toFixed(3)} DT`, valueX, finalY + 3, { align: "right" });
  }

  // -- Amount in Words --
  doc.setFontSize(10);
  doc.setTextColor(60);
  const amountInWords = convertAmountToText(totalFinal);
  
  // Position text depending on TVA lines
  const wordStartY = applyTva ? finalY + 30 : finalY + 20;
  
  doc.setFont("helvetica", "bold"); 
  const stopPhrase = isDevis 
    ? "Arrêté le présent devis à la somme de :" 
    : "Arrêté la présente facture à la somme de :";
    
  doc.text(stopPhrase, 14, wordStartY);
  
  doc.setFont("helvetica", "bold-italic");
  doc.setTextColor(0);
  doc.text(`${amountInWords}`, 14, wordStartY + 6);

  // -- Footer (Notes) --
  if (invoice.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Notes:", 14, wordStartY + 20);
    doc.text(invoice.notes, 14, wordStartY + 25);
  }
  
  // --- Génération du nom de fichier : Entreprise + F/D + Numéro ---
  // Nettoyage du nom de l'entreprise pour qu'il soit valide dans un nom de fichier
  const safeCompanyName = company.name.replace(/[^a-z0-9]/gi, '_').toUpperCase();
  const prefix = isDevis ? 'D' : 'F';
  const fileName = `${safeCompanyName}_${prefix}-${invoice.number}.pdf`;
  
  doc.save(fileName);
};
