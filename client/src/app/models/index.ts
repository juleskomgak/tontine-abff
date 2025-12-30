// Models
export interface User {
  _id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: 'admin' | 'membre' | 'tresorier';
  isActive: boolean;
  isValidated?: boolean;
  validatedAt?: Date;
  validatedBy?: User | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Member {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone: string;
  adresse?: string;
  numeroIdentite?: string;
  profession?: string;
  dateNaissance?: Date;
  photo?: string;
  user?: User;
  isActive: boolean;
  createdBy: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tontine {
  _id: string;
  nom: string;
  description?: string;
  montantCotisation: number;
  frequence: 'hebdomadaire' | 'bimensuel' | 'mensuel';
  dateDebut: Date;
  dateFin?: Date;
  membres: TontineMember[];
  nombreMembres: number;
  montantTotal: number;
  statut: 'planifie' | 'actif' | 'termine' | 'suspendu';
  cycleCourant: number;
  totalCycles: number;
  createdBy: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TontineMember {
  membre: Member | string;
  dateAdhesion: Date;
  isActive: boolean;
}

export interface Contribution {
  _id: string;
  tontine: Tontine | string;
  membre: Member | string;
  tour?: Tour | string;
  numeroTour?: number;
  montant: number;
  datePaiement: Date;
  cycle: number;
  methodePaiement: 'especes' | 'mobile_money' | 'virement' | 'cheque';
  referenceTransaction?: string;
  statut: 'recu' | 'en_attente' | 'refuse';
  notes?: string;
  enregistrePar: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Tour {
  _id: string;
  tontine: Tontine | string;
  beneficiaire: Member | string;
  numeroTour: number;
  cycle: number;
  montantRecu: number;
  dateAttribution: Date;
  dateReceptionPrevue: Date;
  datePaiement?: Date;
  modeAttribution: 'tirage_au_sort' | 'ordre_alphabetique' | 'manuel' | 'urgence';
  statut: 'attribue' | 'paye' | 'en_attente' | 'refuse';
  notes?: string;
  attribuePar: User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    token?: string;
    pendingValidation?: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  errors?: any[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone?: string;
  role?: string;
}

export interface ContributionStats {
  totalContributions: number;
  nombrePaiements: number;
  nombreMembresAttendus: number;
  montantAttendu: number;
  tauxCollecte: string;
  cycleCourant: number;
}

export interface Transaction {
  _id: string;
  type: 'cotisation' | 'paiement_tour' | 'refus_tour' | 'redistribution' | 'ajustement';
  montant: number;
  description?: string;
  tour?: Tour | string;
  contribution?: Contribution | string;
  membre?: Member | string;
  date: Date;
  effectuePar: User;
}

export interface TourRefuse {
  tour: Tour | string;
  beneficiaire: Member | string;
  montant: number;
  dateRefus: Date;
  raison?: string;
  cycle: number;
}

export interface BeneficiaireRedistribution {
  membre: Member | string;
  montant: number;
  date: Date;
}

export interface BanqueTontine {
  _id: string;
  tontine: Tontine | string;
  soldeTotal: number;
  soldeCotisations: number;
  soldeRefus: number;
  totalCotise: number;
  totalDistribue: number;
  totalRefus: number;
  toursRefuses: TourRefuse[];
  redistribue: boolean;
  dateRedistribution?: Date;
  beneficiairesRedistribution: BeneficiaireRedistribution[];
  transactions: Transaction[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// New generalized BanqueCentrale interface includes solidarites and cartes summary
export interface BanqueCentrale extends BanqueTontine {
  solidarites?: Array<{
    typeSolidarite: string;
    totalCollecte: number;
    montantAttendu: number;
  }>;
  cartesCodebaf?: {
    totalCartes: number;
    totalMontantAttendu: number;
    totalMontantPaye: number;
  };
}

// Backward compatibility: alias BanqueTontine -> BanqueCentrale
export type Banque = BanqueCentrale;

export interface BanqueStats {
  soldeTotal: number;
  soldeCotisations: number;
  soldeRefus: number;
  totalCotise: number;
  totalDistribue: number;
  totalRefus: number;
  nombreToursRefuses: number;
  redistribue: boolean;
  tauxDistribution: string;
  montantAttendu: number;
}

// Cartes CODEBAF
export interface PaiementCarte {
  _id: string;
  montant: number;
  datePaiement: Date;
  methodePaiement: 'especes' | 'mobile_money' | 'virement' | 'cheque';
  referenceTransaction?: string;
  notes?: string;
  enregistrePar: User | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CarteCodebaf {
  _id: string;
  membre: Member | string;
  annee: number;
  typeCarte: 'classique' | 'bronze' | 'silver' | 'gold';
  montantTotal: number;
  frequencePaiement: 'annuel' | 'trimestriel' | 'mensuel';
  montantParEcheance: number;
  nombreEcheances: number;
  paiements: PaiementCarte[];
  montantPaye: number;
  montantRestant: number;
  statut: 'en_cours' | 'complete' | 'annule';
  dateDebut: Date;
  dateFin: Date;
  notes?: string;
  createdBy: User | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CarteCodebafStats {
  global: {
    totalCartes: number;
    totalMontantAttendu: number;
    totalMontantPaye: number;
    totalMontantRestant: number;
    tauxRecouvrement: string;
  };
  parAnnee: Array<{
    _id: number;
    totalCartes: number;
    totalMontantAttendu: number;
    totalMontantPaye: number;
    totalMontantRestant: number;
  }>;
  parType: Array<{
    _id: string;
    count: number;
    totalMontant: number;
    totalPaye: number;
  }>;
  derniersPaiements: Array<{
    _id: string;
    membre: Member;
    typeCarte: string;
    annee: number;
    montant: number;
    datePaiement: Date;
    methodePaiement: string;
    enregistrePar: User;
  }>;
}
