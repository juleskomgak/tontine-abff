import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  requireReason?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule, FormsModule],
  template: `
    <h1 mat-dialog-title>{{ data.title || 'Confirmation' }}</h1>

    <mat-dialog-content>
      <p style="margin:0 0 8px 0; white-space:pre-wrap;">{{ data.message }}</p>

      <div *ngIf="data.requireReason" style="margin-top:8px">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Raison (optionnelle)</mat-label>
          <input matInput [(ngModel)]="reason" />
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">{{ data.cancelLabel || 'Annuler' }}</button>
      <button mat-flat-button color="primary" (click)="onConfirm()">{{ data.confirmLabel || 'Confirmer' }}</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  reason: string | undefined;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm() {
    this.dialogRef.close({ confirmed: true, reason: this.reason });
  }

  onCancel() {
    this.dialogRef.close({ confirmed: false });
  }
}
