import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-prompt',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-prompt.component.html',
  styleUrl: './modal-prompt.component.css'
})
export class ModalPromptComponent {
  @Input() title: string = 'Confirmar';
  @Input() description: string = 'Por favor ingrese un mensaje';
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  input: string = '';

  onSubmit() {
    if (this.input.trim()) this.confirm.emit(this.input.trim());
  }

  onCancel() {
    this.cancel.emit();
  }
}
