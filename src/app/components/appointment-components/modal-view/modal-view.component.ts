import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { TreatedPatient } from '../../../interfaces/TreatedPatient';
import { CompletedAppointment } from '../../../interfaces/CompletedAppointment';
import { SpanishDatePipe } from '../../../pipes/spanish-date.pipe';

@Component({
  selector: 'app-modal-view',
  imports: [CommonModule, SpanishDatePipe],
  templateUrl: './modal-view.component.html',
  styleUrl: './modal-view.component.css'
})
export class ModalViewComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() specialistName: string = '';
  @Input() content: string = '';
  @Input() showInput: boolean = false;
  @Input() inputLabel: string = '';
  @Input() showRating: boolean = false;
  @Input() currentRating: number = 0;
  hoverRating: number = 0;
  @Input() showConfirmButton: boolean = false;
  @Input() showCancelButton: boolean = true;
  @Input() confirmButtonText: string = 'Confirmar';
  @Input() selectedPatientForModal: TreatedPatient | null = null;
  @ViewChild('inputField') inputField!: ElementRef<HTMLTextAreaElement>;
  
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();
  @Output() ratingChange = new EventEmitter<number>();
  
  @Input() selectedPatient: TreatedPatient | null = null;
  @Input() patientAppointments: CompletedAppointment[] = [];

  setRating(star: number) {
    this.currentRating = star;
    this.ratingChange.emit(star);
  }

  setHover(star: number) {
    this.hoverRating = star;
  }

  clearHover() {
    this.hoverRating = 0;
  }

  get displayRating(): number {
    const rating = this.hoverRating || this.currentRating;
    console.log('displayRating', rating);
    return rating;
  }

  onClose() {
    this.close.emit();
  }

  onConfirm() {
    const inputValue = this.inputField?.nativeElement.value || '';
    this.confirm.emit(inputValue);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

