
export interface Client {
  id: string;
  name: string;
  mf: string; // Matricule Fiscal
  address: string;
  email?: string;
  phone?: string;
}

export interface Company {
  id: string;
  name: string;
  mf: string;
  address: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  isDefault?: boolean;
}

export interface InvoiceItem {
  id: string;
  description: string;
  unit: string; // Ajout de l'unité (U, Kg, M, etc.)
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  type: 'facture' | 'devis'; // Distinction Facture / Devis
  number: string;
  date: string;
  dueDate: string;
  clientId: string;
  clientSnap: Client;
  companySnap: Company;
  items: InvoiceItem[];
  tvaApplicable: boolean; // Option Sans TVA
  tvaRate: number;
  notes?: string;
  status: 'brouillon' | 'payée' | 'en_attente' | 'accepté' | 'refusé';
}

export type ViewState = 'dashboard' | 'clients' | 'create-invoice' | 'history' | 'settings';
