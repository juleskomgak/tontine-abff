import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SolidariteConfig {
  _id: string;
  nom: 'repas' | 'membre' | 'assurance_rapatriement';
  libelle: string;
  description?: string;
  montantMensuel: number;
  montantTrimestriel: number;
  montantAnnuel: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaiementSolidarite {
  _id: string;
  membre: {
    _id: string;
    nom: string;
    prenom: string;
    telephone?: string;
  };
  typeSolidarite: 'repas' | 'membre' | 'assurance_rapatriement';
  montant: number;
  frequence: 'mensuel' | 'trimestriel' | 'annuel';
  periodeDebut: Date;
  periodeFin: Date;
  datePaiement: Date;
  annee: number;
  mois?: number;
  trimestre?: number;
  methodePaiement?: string;
  referenceTransaction?: string;
  statut: string;
  notes?: string;
  enregistrePar?: {
    _id: string;
    nom: string;
    prenom: string;
  };
}

export interface MembreSolidariteStatut {
  membre: {
    _id: string;
    nom: string;
    prenom: string;
    telephone?: string;
  };
  solidarites: {
    [key: string]: {
      libelle: string;
      totalPaye: number;
      montantAttendu: number;
      moisPayes: number[];
      moisEnRetard: number[];
      statut: 'a_jour' | 'en_retard';
      paiements: PaiementSolidarite[];
    };
  };
}

export interface StatutsResponse {
  annee: number;
  moisActuel: number;
  configs: SolidariteConfig[];
  statuts: MembreSolidariteStatut[];
}

export interface SolidariteStats {
  annee: number;
  totalMembres: number;
  solidarites: {
    [key: string]: {
      libelle: string;
      montantMensuel: number;
      montantAnnuel: number;
      totalCollecte: number;
      montantAttendu: number;
      tauxCollecte: string;
      nombrePaiements: number;
      membresAyantPaye: number;
    };
  };
  totalGlobal: {
    totalCollecte: number;
    montantAttendu: number;
    tauxCollecte: string;
  };
}

export interface MembreDetailStatut {
  membre: any;
  annee: number;
  moisActuel: number;
  solidarites: {
    [key: string]: {
      config: SolidariteConfig;
      totalPaye: number;
      montantAttendu: number;
      montantRestant: number;
      moisPayes: number[];
      moisEnRetard: number[];
      statut: 'a_jour' | 'en_retard';
      paiements: PaiementSolidarite[];
    };
  };
}
@Injectable({ providedIn: 'root' })
export class SolidariteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/solidarites`;

  // Signals
  configs = signal<SolidariteConfig[]>([]);
  paiements = signal<PaiementSolidarite[]>([]);
  statuts = signal<MembreSolidariteStatut[]>([]);
  stats = signal<SolidariteStats | null>(null);
  loading = signal(false);
  selectedAnnee = signal(new Date().getFullYear());

  // Computed
  membresEnRetard = computed(() => {
    return this.statuts().filter(s => 
      Object.values(s.solidarites).some(sol => sol.statut === 'en_retard')
    );
  });

  membresAJour = computed(() => {
    return this.statuts().filter(s => 
      Object.values(s.solidarites).every(sol => sol.statut === 'a_jour')
    );
  });

  // ============== CONFIGURATION ==============

  getConfigs(): Observable<{ success: boolean; data: SolidariteConfig[] }> {
    return this.http.get<{ success: boolean; data: SolidariteConfig[] }>(`${this.apiUrl}/config`)
      .pipe(tap(res => {
        if (res.success) {
          this.configs.set(res.data);
        }
      }));
  }

  updateConfig(nom: string, data: Partial<SolidariteConfig>): Observable<{ success: boolean; data: SolidariteConfig }> {
    return this.http.put<{ success: boolean; data: SolidariteConfig }>(`${this.apiUrl}/config/${nom}`, data);
  }

  initConfigs(): Observable<{ success: boolean; message: string; data: SolidariteConfig[] }> {
    return this.http.post<{ success: boolean; message: string; data: SolidariteConfig[] }>(`${this.apiUrl}/init`, {})
      .pipe(tap(res => {
        if (res.success) {
          this.configs.set(res.data);
        }
      }));
  }

  createConfig(data: Partial<SolidariteConfig>): Observable<{ success: boolean; data: SolidariteConfig }> {
    return this.http.post<{ success: boolean; data: SolidariteConfig }>(`${this.apiUrl}/config`, data);
  }

  // ============== PAIEMENTS ==============

  getPaiements(filters?: {
    membre?: string;
    typeSolidarite?: string;
    annee?: number;
    mois?: number;
    trimestre?: number;
    statut?: string;
  }): Observable<{ success: boolean; count: number; data: PaiementSolidarite[] }> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<{ success: boolean; count: number; data: PaiementSolidarite[] }>(
      `${this.apiUrl}/paiements`, { params }
    ).pipe(tap(res => {
      if (res.success) {
        this.paiements.set(res.data);
      }
    }));
  }

  createPaiement(data: {
    membre: string;
    typeSolidarite: 'repas' | 'membre' | 'assurance_rapatriement';
    montant: number;
    frequence: 'mensuel' | 'trimestriel' | 'annuel';
    annee: number;
    mois?: number;
    trimestre?: number;
    methodePaiement?: string;
    referenceTransaction?: string;
    notes?: string;
  }): Observable<{ success: boolean; data: PaiementSolidarite }> {
    return this.http.post<{ success: boolean; data: PaiementSolidarite }>(`${this.apiUrl}/paiements`, data);
  }

  deletePaiement(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/paiements/${id}`);
  }

  // ============== STATUTS ==============

  getStatuts(annee?: number, typeSolidarite?: string): Observable<{ success: boolean; data: StatutsResponse }> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', annee.toString());
    if (typeSolidarite) params = params.set('typeSolidarite', typeSolidarite);
    
    return this.http.get<{ success: boolean; data: StatutsResponse }>(`${this.apiUrl}/statuts`, { params })
      .pipe(tap(res => {
        if (res.success) {
          this.statuts.set(res.data.statuts);
          this.configs.set(res.data.configs);
        }
      }));
  }

  getMembreStatut(membreId: string, annee?: number): Observable<{ success: boolean; data: MembreDetailStatut }> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', annee.toString());
    
    return this.http.get<{ success: boolean; data: MembreDetailStatut }>(`${this.apiUrl}/statuts/${membreId}`, { params });
  }

  // ============== STATISTIQUES ==============

  getStats(annee?: number): Observable<{ success: boolean; data: SolidariteStats }> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', annee.toString());
    
    return this.http.get<{ success: boolean; data: SolidariteStats }>(`${this.apiUrl}/stats`, { params })
      .pipe(tap(res => {
        if (res.success) {
          this.stats.set(res.data);
        }
      }));
  }

  // ============== HELPERS ==============

  getMoisNom(mois: number): string {
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return moisNoms[mois - 1] || '';
  }

  getTrimestreNom(trimestre: number): string {
    return `T${trimestre}`;
  }

  getTypeSolidariteLibelle(type: string): string {
    const libelles: { [key: string]: string } = {
      'repas': 'Solidarité Repas',
      'membre': 'Solidarité Membre',
      'assurance_rapatriement': 'Assurance Rapatriement'
    };
    return libelles[type] || type;
  }
}
