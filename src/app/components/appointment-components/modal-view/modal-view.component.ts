import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { TreatedPatient } from '../../../interfaces/TreatedPatient';
import { CompletedAppointment } from '../../../interfaces/CompletedAppointment';
import { SpanishDatePipe } from '../../../pipes/spanish-date.pipe';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReviewContent } from '../../../interfaces/ReviewContent';

@Component({
  selector: 'app-modal-view',
  imports: [CommonModule, SpanishDatePipe, FormsModule, ReactiveFormsModule],
  templateUrl: './modal-view.component.html',
  styleUrl: './modal-view.component.css'
})
export class ModalViewComponent {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() specialistName: string = '';
  @Input() content!: string | ReviewContent;
  @Input() showInput: boolean = false;
  @Input() inputLabel: string = '';
  @Input() showRating: boolean = false;
  @Input() action: 'survey' | null = null;
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
  
  @Input() showVitalSigns: boolean = false;
  vitalSigns = {
    height: null,
    weight: null,
    temperature: null,
    pressure: ''
  };
  
  extraFields: { key: string; value: string }[] = [];
  vitalForm!: FormGroup;
  inputError = false;
  

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    if (this.showVitalSigns) {
      this.vitalForm = this.fb.group({
        height: [null, [Validators.required, Validators.min(40)]],
        weight: [null, [Validators.required, Validators.min(1)]],
        temperature: [null, [Validators.required, Validators.min(27)]],
        pressure: [null, Validators.required]
      });
    }
  }
  
  isInvalid(controlName: string): boolean {
    const ctrl = this.vitalForm?.get(controlName);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }
  
  addExtraField() {
    if (this.extraFields.length < 3) {
      this.extraFields.push({ key: '', value: '' });
    }
  }

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
    return rating;
  }

  onClose() {
    this.close.emit();
  }

  onConfirm() {
    const inputValue = this.inputField?.nativeElement.value || '';
    this.inputError = false;

    if (this.showInput && !inputValue) {
      this.inputError = true;
      return;
    }

    if (this.showVitalSigns && this.vitalForm?.invalid) {
      this.vitalForm.markAllAsTouched();
      return;
    }

    const payload: any = {
      comment: inputValue
    };

    if (this.action !== 'survey' && this.currentRating > 0) {
      payload.rating = this.currentRating;
    }

    if (this.showVitalSigns && this.vitalForm?.valid) {
      payload.vitalSigns = this.vitalForm.value;
    }

    const extra = this.extraFields.filter(f => f.key && f.value);
    if (extra.length) {
      payload.extraInfo = extra;
    }

    this.confirm.emit(JSON.stringify(payload));
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatReview(review: string): string {
    try {
      const r = JSON.parse(review);
      let result = '';
      if (r.comment) result += `${r.comment}\n`;
      return result.trim() || 'Sin reseña';
    } catch {
      return review || 'Sin reseña';
    }
  }

  isObject(val: any): val is ReviewContent {
    return typeof val === 'object' && val !== null && 'review' in val;
  }
}

